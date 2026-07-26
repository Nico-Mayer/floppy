// croctool is a minimal croc peer used by the transfer tests to exercise
// real transfers against the Manager from a separate process — the way an
// actual peer would; two endpoints of the *same* transfer cannot share a
// process (the PAKE handshake garbles). Not part of the app build: testdata
// is invisible to the go tool.
//
// usage:
//
//	croctool send <file>            prints "CODE:<phrase>", then sends
//	croctool recv <code> <destdir>  receives into destdir
//
// env:
//
//	CROC_RELAY     relay address (host:port); empty = croc's public relay
//	CROC_RELAY6    IPv6 relay address; empty = none when CROC_RELAY is set
//	CROC_PASS      relay password
//	CROC_NO_LOCAL  "1" disables LAN discovery and the sender's local relay
//	CROC_THROTTLE  upload throttle for send, e.g. "500k"
package main

import (
	"fmt"
	"os"

	"floppy/internal/transfer"

	"github.com/schollz/croc/v10/src/croc"
	"github.com/schollz/croc/v10/src/utils"
)

// options builds croc options through the same helper the app uses, so the
// test peer can never drift from the app's transfer settings.
func options(isSender bool, secret string) croc.Options {
	o := transfer.CrocOptions(isSender, secret, transfer.RelayConfig{
		Address:      os.Getenv("CROC_RELAY"),
		Address6:     os.Getenv("CROC_RELAY6"),
		Password:     os.Getenv("CROC_PASS"),
		DisableLocal: os.Getenv("CROC_NO_LOCAL") == "1",
	})
	// Lets tests slow the transfer down enough to observe progress.
	o.ThrottleUpload = os.Getenv("CROC_THROTTLE")
	return o
}

func run() error {
	if len(os.Args) < 3 {
		return fmt.Errorf("usage: croctool send <file> | croctool recv <code> <destdir>")
	}
	switch os.Args[1] {
	case "send":
		opts := options(true, utils.GetRandomName())
		client, err := croc.New(opts)
		if err != nil {
			return err
		}
		fi, ef, tf, err := croc.GetFilesInfo([]string{os.Args[2]}, false, false, nil)
		if err != nil {
			return err
		}
		fmt.Println("CODE:" + opts.SharedSecret)
		if err := client.Send(fi, ef, tf); err != nil {
			return err
		}
		fmt.Println("SENDOK")
	case "recv":
		if len(os.Args) < 4 {
			return fmt.Errorf("recv needs <code> <destdir>")
		}
		if err := os.Chdir(os.Args[3]); err != nil {
			return err
		}
		client, err := croc.New(options(false, os.Args[2]))
		if err != nil {
			return err
		}
		if err := client.Receive(); err != nil {
			return err
		}
		fmt.Println("RECVOK")
	default:
		return fmt.Errorf("unknown mode %q", os.Args[1])
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "croctool:", err)
		os.Exit(1)
	}
}
