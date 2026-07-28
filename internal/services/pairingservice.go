package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"floppy/internal/broker"
	"floppy/internal/pairing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// PairingService is the trusted-device Wails adapter. It owns the device
// identity and trust store, talks to the rendezvous broker, and turns accepted
// offers into coded transfers on the shared Manager (via CrocService). The
// croc/transfer core is untouched — this service only decides *what code* to
// run and *when*.
//
// Desktop-first slice: an incoming offer surfaces as a pairing:offer event that
// the frontend renders as an Accept/Decline modal (the app is assumed open).
// The OS interactive notification that wakes a closed app is the later mobile
// layer, on this same protocol.
type PairingService struct {
	// Set by main before Run; empty values fall back to sensible defaults.
	IdentityDir string // where identity + trust live; default: user config dir
	BrokerURL   string // ws://…/ws; default: ws://localhost:8080/ws
	SeedTrust   string // dev seam (3.7): "<encoded-public-key>[,name]"

	id    *pairing.Identity
	trust *pairing.TrustStore
	rv    rendezvous
	xfer  transferer
	emit  func(name string, data any)

	mu       sync.Mutex
	outgoing map[string]pendingSend   // transferID → awaiting the receiver's response
	incoming map[string]pairing.Offer // transferID → awaiting the user's accept/decline
	accepted map[string]pairing.Offer // transferID → accepted, awaiting the sender's ready
}

// rendezvous is the broker seam — faked in tests so no WebSocket is needed.
type rendezvous interface {
	Send(to string, sig pairing.Signal) error
	Signals() <-chan pairing.Signal
	Close() error
}

// transferer is the transfer seam — CrocService satisfies it; tests fake it.
type transferer interface {
	SendCoded(paths []string, code string) (string, error)
	ReceiveCoded(code string) (string, error)
}

type pendingSend struct {
	peer  pairing.PublicKey
	paths []string
}

// Pairing event names — the frontend wire contract.
const (
	EventPairingOffer    = "pairing:offer"
	EventPairingAccepted = "pairing:accepted"
	EventPairingDeclined = "pairing:declined"
	EventPairingError    = "pairing:error"
)

// PairingOfferEvent is the payload of pairing:offer — everything the modal needs.
type PairingOfferEvent struct {
	TransferID      string `json:"transferId"`
	FromName        string `json:"fromName"`
	FromFingerprint string `json:"fromFingerprint"`
	FileCount       int    `json:"fileCount"`
	TotalBytes      int64  `json:"totalBytes"`
}

// PairingStatusEvent is the payload of pairing:accepted and pairing:declined.
type PairingStatusEvent struct {
	TransferID string `json:"transferId"`
}

// PairingErrorEvent is the payload of pairing:error.
type PairingErrorEvent struct {
	TransferID string `json:"transferId"`
	Code       string `json:"code"`
	Message    string `json:"message"`
}

// DeviceInfo is a trusted device as shown to the frontend.
type DeviceInfo struct {
	Fingerprint string `json:"fingerprint"`
	Name        string `json:"name"`
}

// RegisterPairingEvents declares the pairing events for the bindings generator.
func RegisterPairingEvents() {
	application.RegisterEvent[PairingOfferEvent](EventPairingOffer)
	application.RegisterEvent[PairingStatusEvent](EventPairingAccepted)
	application.RegisterEvent[PairingStatusEvent](EventPairingDeclined)
	application.RegisterEvent[PairingErrorEvent](EventPairingError)
}

var (
	errPairingNotStarted = errors.New("pairing service not started")
	errNotTrusted        = errors.New("device is not trusted")
	errUnknownTransfer   = errors.New("no such pending transfer")
	errNoRendezvous      = errors.New("not connected to the rendezvous broker")
)

// NewPairingService constructs the service with its transferer injected. It is
// a plain constructor, not a bound method, so the internal transfer seam never
// reaches the generated frontend bindings. Config fields are set by the caller
// afterwards.
func NewPairingService(xfer transferer) *PairingService {
	return &PairingService{xfer: xfer}
}

// ServiceStartup loads identity + trust, applies any seeded trust, and connects
// to the broker. A broker that is down degrades gracefully: normal croc
// transfers keep working; only trusted-device sends are unavailable.
func (s *PairingService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	if s.emit == nil {
		s.emit = func(name string, data any) { application.Get().Event.Emit(name, data) }
	}
	s.outgoing = make(map[string]pendingSend)
	s.incoming = make(map[string]pairing.Offer)
	s.accepted = make(map[string]pairing.Offer)

	dir := s.IdentityDir
	if dir == "" {
		cfg, err := os.UserConfigDir()
		if err != nil {
			return fmt.Errorf("pairing: locating config dir: %w", err)
		}
		dir = filepath.Join(cfg, "floppy")
	}
	id, err := pairing.LoadOrCreate(dir)
	if err != nil {
		return err
	}
	trust, err := pairing.LoadTrustStore(dir)
	if err != nil {
		return err
	}
	s.id, s.trust = id, trust
	if err := s.applySeedTrust(); err != nil {
		slog.Warn("pairing: seed-trust ignored", "err", err)
	}
	slog.Info("pairing: identity ready", "fingerprint", id.Fingerprint()[:8])

	if s.rv == nil {
		url := s.BrokerURL
		if url == "" {
			url = "ws://localhost:8080/ws"
		}
		dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		client, err := broker.Dial(dialCtx, url, id)
		if err != nil {
			slog.Warn("pairing: broker unavailable, trusted-device transfers disabled", "err", err)
			return nil
		}
		s.rv = client
	}
	go s.consume()
	return nil
}

// ServiceShutdown closes the rendezvous connection.
func (s *PairingService) ServiceShutdown() error {
	if s.rv != nil {
		return s.rv.Close()
	}
	return nil
}

// applySeedTrust honours the --seed-trust dev seam: "<encoded-public-key>[,name]".
func (s *PairingService) applySeedTrust() error {
	if s.SeedTrust == "" {
		return nil
	}
	encoded, name, _ := strings.Cut(s.SeedTrust, ",")
	pk, err := pairing.DecodePublicKey(strings.TrimSpace(encoded))
	if err != nil {
		return err
	}
	return s.trust.Add(pk, strings.TrimSpace(name))
}

// Identity returns this device's public identity, encoded for display/QR.
func (s *PairingService) Identity() (string, error) {
	if s.id == nil {
		return "", errPairingNotStarted
	}
	return s.id.Public().Encode(), nil
}

// PairingPreview is what the pairing UI shows before a device is trusted: the
// peer's fingerprint and the SAS both screens must match. Computing the SAS
// needs the private key, so it lives here, never in the frontend.
type PairingPreview struct {
	Fingerprint string `json:"fingerprint"`
	SAS         string `json:"sas"`
}

// PreviewPairing decodes an encoded peer identity and returns its fingerprint
// and the shared SAS for the compare step. It does not trust the device — Trust
// does that once the user confirms the codes match.
func (s *PairingService) PreviewPairing(encoded string) (PairingPreview, error) {
	if s.id == nil {
		return PairingPreview{}, errPairingNotStarted
	}
	pk, err := pairing.DecodePublicKey(strings.TrimSpace(encoded))
	if err != nil {
		return PairingPreview{}, err
	}
	secret, err := s.id.SharedSecret(pk)
	if err != nil {
		return PairingPreview{}, err
	}
	sas, err := pairing.SAS(secret)
	if err != nil {
		return PairingPreview{}, err
	}
	return PairingPreview{Fingerprint: pk.Fingerprint(), SAS: pairing.FormatSAS(sas)}, nil
}

// Trust records a peer as trusted after the user confirmed the SAS. name is the
// display label.
func (s *PairingService) Trust(encoded, name string) error {
	if s.trust == nil {
		return errPairingNotStarted
	}
	pk, err := pairing.DecodePublicKey(strings.TrimSpace(encoded))
	if err != nil {
		return err
	}
	return s.trust.Add(pk, name)
}

// Untrust removes a device by fingerprint — the desktop stand-in for revocation.
func (s *PairingService) Untrust(fingerprint string) error {
	if s.trust == nil {
		return errPairingNotStarted
	}
	return s.trust.Remove(fingerprint)
}

// TrustedDevices lists the devices this install trusts.
func (s *PairingService) TrustedDevices() ([]DeviceInfo, error) {
	if s.trust == nil {
		return nil, errPairingNotStarted
	}
	devices := s.trust.List()
	out := make([]DeviceInfo, 0, len(devices))
	for _, d := range devices {
		out = append(out, DeviceInfo{Fingerprint: d.Fingerprint(), Name: d.Name})
	}
	return out, nil
}

// SendTo offers paths to a trusted device. It returns the transfer id; the
// actual send only starts once that device accepts (pairing:accepted) — or is
// reported via pairing:declined / pairing:error.
func (s *PairingService) SendTo(fingerprint string, paths []string) (string, error) {
	if s.id == nil {
		return "", errPairingNotStarted
	}
	if s.rv == nil {
		return "", errNoRendezvous
	}
	dev, ok := s.trust.Get(fingerprint)
	if !ok {
		return "", errNotTrusted
	}
	transferID, err := newTransferID()
	if err != nil {
		return "", err
	}
	offer := s.id.SignOffer(transferID, time.Now().Unix(), len(paths), totalBytes(paths))

	s.mu.Lock()
	s.outgoing[transferID] = pendingSend{peer: dev.Key, paths: paths}
	s.mu.Unlock()

	if err := s.rv.Send(fingerprint, pairing.Signal{Kind: pairing.SignalOffer, Offer: &offer}); err != nil {
		s.mu.Lock()
		delete(s.outgoing, transferID)
		s.mu.Unlock()
		return "", fmt.Errorf("pairing: sending offer: %w", err)
	}
	return transferID, nil
}

// Accept confirms an incoming offer and tells the sender to begin. It does NOT
// start receiving yet: the sender starts its croc endpoint first (mirroring the
// classic code flow, where the sender creates the room and hashes before the
// receiver joins), then signals ready — see onReady. No code or passphrase is
// entered by the user.
func (s *PairingService) Accept(transferID string) error {
	s.mu.Lock()
	offer, ok := s.incoming[transferID]
	delete(s.incoming, transferID)
	if ok {
		s.accepted[transferID] = offer
	}
	s.mu.Unlock()
	if !ok {
		return errUnknownTransfer
	}
	resp := s.id.SignResponse(transferID, true)
	if err := s.rv.Send(offer.From.Fingerprint(), pairing.Signal{Kind: pairing.SignalResponse, Response: &resp}); err != nil {
		s.mu.Lock()
		delete(s.accepted, transferID)
		s.mu.Unlock()
		s.emitError(transferID, "accept_failed", err.Error())
		return err
	}
	return nil
}

// Decline rejects an incoming offer and tells the sender.
func (s *PairingService) Decline(transferID string) error {
	s.mu.Lock()
	offer, ok := s.incoming[transferID]
	delete(s.incoming, transferID)
	s.mu.Unlock()
	if !ok {
		return errUnknownTransfer
	}
	resp := s.id.SignResponse(transferID, false)
	if err := s.rv.Send(offer.From.Fingerprint(), pairing.Signal{Kind: pairing.SignalResponse, Response: &resp}); err != nil {
		slog.Warn("pairing: could not notify sender of decline", "err", err)
	}
	return nil
}

// consume dispatches incoming rendezvous signals until the connection closes.
func (s *PairingService) consume() {
	for sig := range s.rv.Signals() {
		switch sig.Kind {
		case pairing.SignalOffer:
			if sig.Offer != nil {
				s.onOffer(*sig.Offer)
			}
		case pairing.SignalResponse:
			if sig.Response != nil {
				s.onResponse(*sig.Response)
			}
		case pairing.SignalReady:
			s.onReady(sig.TransferID)
		case pairing.SignalUnreachable:
			s.onUnreachable(sig.To)
		}
	}
}

// onOffer (receiver side): verify and surface an accept/decline prompt. An
// untrusted or forged offer is dropped silently — the user never sees it.
func (s *PairingService) onOffer(offer pairing.Offer) {
	if err := offer.Verify(s.trust); err != nil {
		slog.Warn("pairing: rejected incoming offer", "err", err)
		return
	}
	dev, _ := s.trust.Get(offer.From.Fingerprint())
	s.mu.Lock()
	s.incoming[offer.TransferID] = offer
	s.mu.Unlock()
	s.emit(EventPairingOffer, PairingOfferEvent{
		TransferID:      offer.TransferID,
		FromName:        dev.Name,
		FromFingerprint: offer.From.Fingerprint(),
		FileCount:       offer.FileCount,
		TotalBytes:      offer.TotalBytes,
	})
}

// onResponse (sender side): on accept, derive the code and start sending; on
// decline, surface it. Unknown or unverifiable responses are dropped.
func (s *PairingService) onResponse(resp pairing.Response) {
	if err := resp.Verify(s.trust); err != nil {
		slog.Warn("pairing: rejected response", "err", err)
		return
	}
	s.mu.Lock()
	out, ok := s.outgoing[resp.TransferID]
	if ok {
		delete(s.outgoing, resp.TransferID)
	}
	s.mu.Unlock()
	if !ok {
		return
	}
	if !resp.Accept {
		s.emit(EventPairingDeclined, PairingStatusEvent{TransferID: resp.TransferID})
		return
	}
	code, err := s.deriveCode(out.peer, resp.TransferID)
	if err != nil {
		s.emitError(resp.TransferID, "derive_failed", err.Error())
		return
	}
	// Sender starts first, then tells the receiver to join — so croc's send
	// endpoint (and its file hashing) is up before the receiver connects.
	if _, err := s.xfer.SendCoded(out.paths, code); err != nil {
		s.emitError(resp.TransferID, "send_failed", err.Error())
		return
	}
	if err := s.rv.Send(resp.From.Fingerprint(), pairing.Signal{Kind: pairing.SignalReady, TransferID: resp.TransferID}); err != nil {
		slog.Warn("pairing: could not signal ready to receiver", "err", err)
	}
	s.emit(EventPairingAccepted, PairingStatusEvent{TransferID: resp.TransferID})
}

// onReady (receiver side): the sender's croc endpoint is up, so join it now.
func (s *PairingService) onReady(transferID string) {
	s.mu.Lock()
	offer, ok := s.accepted[transferID]
	delete(s.accepted, transferID)
	s.mu.Unlock()
	if !ok {
		return
	}
	code, err := s.deriveCode(offer.From, transferID)
	if err != nil {
		s.emitError(transferID, "derive_failed", err.Error())
		return
	}
	if _, err := s.xfer.ReceiveCoded(code); err != nil {
		s.emitError(transferID, "receive_failed", err.Error())
		return
	}
	s.emit(EventPairingAccepted, PairingStatusEvent{TransferID: transferID})
}

// onUnreachable fails every pending send aimed at the offline device.
func (s *PairingService) onUnreachable(fingerprint string) {
	var failed []string
	s.mu.Lock()
	for id, out := range s.outgoing {
		if out.peer.Fingerprint() == fingerprint {
			failed = append(failed, id)
			delete(s.outgoing, id)
		}
	}
	s.mu.Unlock()
	for _, id := range failed {
		s.emitError(id, "unreachable", "the device is not connected")
	}
}

func (s *PairingService) deriveCode(peer pairing.PublicKey, transferID string) (string, error) {
	secret, err := s.id.SharedSecret(peer)
	if err != nil {
		return "", err
	}
	return pairing.DeriveCode(secret, transferID)
}

func (s *PairingService) emitError(transferID, code, msg string) {
	s.emit(EventPairingError, PairingErrorEvent{TransferID: transferID, Code: code, Message: msg})
}

// newTransferID is a random opaque id shared by both sides of one transfer.
func newTransferID() (string, error) {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("pairing: generating transfer id: %w", err)
	}
	return hex.EncodeToString(b[:]), nil
}

// totalBytes best-effort sums the sizes of paths (files and directory trees)
// for the offer's display metadata; unreadable paths are skipped.
func totalBytes(paths []string) int64 {
	var total int64
	for _, p := range paths {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if !info.IsDir() {
			total += info.Size()
			continue
		}
		_ = filepath.WalkDir(p, func(_ string, d os.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			if fi, err := d.Info(); err == nil {
				total += fi.Size()
			}
			return nil
		})
	}
	return total
}
