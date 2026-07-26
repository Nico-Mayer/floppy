package transfer

import (
	"context"
	"time"
)

const (
	defaultPollInterval = 200 * time.Millisecond
	// Weight of the newest rate sample in the running average. Low enough
	// that a stalled or bursty poll doesn't make the readout jump around.
	rateSmoothing = 0.25
	// Emit at least this often once a transfer is running: the percentage
	// stands still for minutes on a large file, but speed and ETA must not.
	defaultStatsInterval = time.Second
)

// snapshotter is the poller's view of a peer. The production implementation
// (crocPeer.Snapshot) is intentionally unsynchronized — see its RACE FENCE
// comment; fakes in tests are synchronized, which is what keeps the poller
// itself race-detector clean.
type snapshotter interface {
	Snapshot() (snap, bool)
}

// watchProgress polls the peer's counters and calls emit with Stats until
// ctx is cancelled.
//
// The returned channel is closed once the poller has stopped. Callers must
// wait on it before emitting a terminal event: otherwise a tick already past
// its ctx check can emit progress *after* the terminal event and drag the UI
// back out of its completion screen.
func watchProgress(ctx context.Context, s snapshotter, poll, statsEvery time.Duration, emit func(Stats)) <-chan struct{} {
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		ticker := time.NewTicker(poll)
		defer ticker.Stop()
		var (
			bps         float64
			haveRate    bool
			lastSent    int64
			lastSample  time.Time
			lastEmit    time.Time
			lastFile    string
			lastPercent = -1
		)
		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				t, ok := s.Snapshot()
				if !ok {
					continue
				}
				// The first sample only establishes a baseline: on a resumed
				// transfer `done` starts at whatever the receiver already has,
				// and dividing that by one poll interval would invent a
				// gigabyte-per-second rate.
				if !lastSample.IsZero() {
					if dt := now.Sub(lastSample).Seconds(); dt > 0 {
						// Clamped: croc resets its byte counter per file, so a
						// file boundary can briefly look like negative progress.
						sample := max(float64(t.done-lastSent)/dt, 0)
						if haveRate {
							bps += rateSmoothing * (sample - bps)
						} else {
							bps, haveRate = sample, true
						}
					}
				}
				lastSent, lastSample = t.done, now

				percent := int(min(t.done*100/t.total, 100))
				// The file being moved changes without the percentage moving,
				// and on the receiving side this payload is the only thing
				// describing what is arriving — so emit on either change.
				if percent == lastPercent && t.file == lastFile && now.Sub(lastEmit) < statsEvery {
					continue
				}
				lastPercent, lastFile, lastEmit = percent, t.file, now
				emit(Stats{
					Percent:   percent,
					Sent:      t.done,
					Total:     t.total,
					Bps:       int64(bps),
					ETA:       etaSeconds(t.total-t.done, bps),
					File:      t.file,
					FileIndex: t.index,
					FileCount: t.count,
				})
			}
		}
	}()
	return stopped
}

// finalStats reports a full progress bar. The poller stops with the
// transfer, so its last sample lands a few percent short of the end —
// without this the bar visibly freezes below 100% before the completion
// screen.
func finalStats(s snapshotter) (Stats, bool) {
	t, ok := s.Snapshot()
	if !ok {
		return Stats{}, false
	}
	return Stats{
		Percent:   100,
		Sent:      t.total,
		Total:     t.total,
		ETA:       -1,
		File:      t.file,
		FileIndex: t.count,
		FileCount: t.count,
	}, true
}

// etaSeconds estimates how long the remaining bytes will take at the given
// rate, returning -1 while the rate is too small to extrapolate from.
func etaSeconds(remaining int64, bps float64) int {
	if remaining <= 0 {
		return 0
	}
	if bps < 1 {
		return -1
	}
	return int(float64(remaining) / bps)
}
