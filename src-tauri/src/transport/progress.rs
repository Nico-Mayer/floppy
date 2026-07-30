// Turns a sequence of raw (bytes-done, total) samples from iroh's progress
// stream into the smoothed rate + ETA the UI shows. iroh reports byte counts,
// not speed, so floppy owns the smoothing.
//
// No polling and no data race here (the reason this file is small): iroh pushes
// progress events, and this only does arithmetic on them.

use std::time::{Duration, Instant};

use crate::transport::event::Stats;

/// Samples closer together than this are folded into the next one instead of
/// being measured on their own. iroh pushes progress thousands of times a
/// second — dividing a few KiB by a sub-millisecond gap invents rates in the
/// tens of GB/s, and an ETA of "0s" for the whole transfer. Measuring over a
/// fixed window is what makes the readout believable; it also caps how often
/// the UI is updated, since `sample` only yields on a fold.
const MIN_SAMPLE_INTERVAL: Duration = Duration::from_millis(250);

/// Time constant of the rate average, in seconds: a change in speed is ~63%
/// reflected after this long. The weight is derived from the actual gap between
/// samples rather than fixed, so an irregular stream still averages honestly.
const RATE_TAU: f64 = 3.0;

/// Accumulates progress samples and derives a smoothed transfer rate + ETA.
pub struct RateTracker {
    bps: f64,
    have_rate: bool,
    last_sent: u64,
    last_sample: Option<Instant>,
}

impl RateTracker {
    pub fn new() -> Self {
        Self { bps: 0.0, have_rate: false, last_sent: 0, last_sample: None }
    }

    /// Fold in a new sample and produce the `Stats` to emit, or `None` when the
    /// sample came too soon after the last one to measure anything (its bytes
    /// are not lost — they count towards the next fold). `now` is injected so
    /// tests are deterministic (no wall-clock reads in the hot path).
    pub fn sample(
        &mut self,
        now: Instant,
        done: u64,
        total: u64,
        file: String,
        file_index: u64,
        file_count: u64,
    ) -> Option<Stats> {
        match self.last_sample {
            // The first sample only establishes a baseline: on a resumed
            // transfer `done` starts at whatever is already held, and dividing
            // that by one interval would invent a gigabyte-per-second rate. It
            // is still emitted — it is what tells the UI bytes are moving.
            None => {}
            Some(prev) => {
                let gap = now.duration_since(prev);
                if gap < MIN_SAMPLE_INTERVAL {
                    return None;
                }
                let dt = gap.as_secs_f64();
                // Clamped at 0: a file boundary can briefly look like negative
                // progress if the counter resets per file.
                let delta = done.saturating_sub(self.last_sent) as f64;
                let rate = (delta / dt).max(0.0);
                if self.have_rate {
                    self.bps += (1.0 - (-dt / RATE_TAU).exp()) * (rate - self.bps);
                } else {
                    self.bps = rate;
                    self.have_rate = true;
                }
            }
        }
        self.last_sent = done;
        self.last_sample = Some(now);

        let percent = if total > 0 {
            ((done as f64 / total as f64) * 100.0).min(100.0)
        } else {
            0.0
        };
        let remaining = total.saturating_sub(done);

        Some(Stats {
            percent,
            sent: done,
            total,
            bps: self.bps,
            eta: eta_seconds(remaining, self.bps),
            file,
            file_index,
            file_count,
        })
    }
}

impl Default for RateTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// The terminal 100% snapshot, emitted just before `Done`. Built here rather
/// than from `Stats::default()` so it keeps the file count: the UI and the
/// completion notification read it from the last progress event, and a default
/// one silently reported "0 files".
pub fn completed(total: u64, file_count: u64) -> Stats {
    Stats {
        percent: 100.0,
        sent: total,
        total,
        bps: 0.0,
        eta: 0,
        file: String::new(),
        file_index: file_count,
        file_count,
    }
}

/// Which file `done` bytes into the manifest lands in: a 1-based index and the
/// name, for the UI's "photo.jpg · 2 of 5" line. `files` is (name, size) in
/// manifest order. Past the end (or empty) reports the last file.
pub fn file_at(files: &[(String, u64)], done: u64) -> (u64, String) {
    let mut end = 0u64;
    for (i, (name, size)) in files.iter().enumerate() {
        end += size;
        if done < end {
            return (i as u64 + 1, name.clone());
        }
    }
    match files.last() {
        Some((name, _)) => (files.len() as u64, name.clone()),
        None => (0, String::new()),
    }
}

/// Seconds to move `remaining` bytes at `bps`, or -1 when not yet known.
fn eta_seconds(remaining: u64, bps: f64) -> i64 {
    if bps <= 0.0 {
        return -1;
    }
    (remaining as f64 / bps).round() as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample(t: &mut RateTracker, at: Instant, done: u64, total: u64) -> Option<Stats> {
        t.sample(at, done, total, "f".into(), 1, 1)
    }

    #[test]
    fn first_sample_has_no_rate() {
        let mut t = RateTracker::new();
        let s = sample(&mut t, Instant::now(), 0, 1000).expect("first sample is emitted");
        assert_eq!(s.bps, 0.0);
        assert_eq!(s.eta, -1);
        assert_eq!(s.percent, 0.0);
    }

    #[test]
    fn rate_and_eta_after_two_samples() {
        let mut t = RateTracker::new();
        let t0 = Instant::now();
        sample(&mut t, t0, 0, 1000);
        // 500 bytes in 1s -> 500 B/s, 500 left -> ~1s ETA.
        let s = sample(&mut t, t0 + Duration::from_secs(1), 500, 1000).unwrap();
        assert_eq!(s.bps, 500.0);
        assert_eq!(s.eta, 1);
        assert_eq!(s.percent, 50.0);
    }

    #[test]
    fn percent_caps_at_100() {
        let mut t = RateTracker::new();
        let s = sample(&mut t, Instant::now(), 1500, 1000).unwrap();
        assert_eq!(s.percent, 100.0);
    }

    // The regression this file exists for: iroh delivers thousands of progress
    // items a second, many in the same microsecond. Measured per item, a 16 KiB
    // chunk over a ~0 gap reads as tens of GB/s and the ETA collapses to 0s for
    // the whole transfer.
    #[test]
    fn bursty_samples_do_not_invent_a_rate() {
        let mut t = RateTracker::new();
        let t0 = Instant::now();
        sample(&mut t, t0, 0, 100_000_000);

        // 10 MB/s delivered as 16 KiB chunks 1.6ms apart, in bursts of 100 that
        // share a timestamp — the shape the real stream has.
        let mut done = 0u64;
        let mut emitted = Vec::new();
        for burst in 0..40 {
            let at = t0 + Duration::from_millis(160 * burst);
            for _ in 0..100 {
                done += 16_384;
                if let Some(s) = sample(&mut t, at, done, 100_000_000) {
                    emitted.push(s);
                }
            }
        }

        let last = emitted.last().expect("some samples are emitted");
        assert!(
            (last.bps - 10_240_000.0).abs() < 1_500_000.0,
            "rate should be ~10 MB/s, got {}",
            last.bps
        );
        // ~34 MB left of 100 MB at ~10 MB/s: a few seconds, not the 0s the
        // per-item measurement used to report.
        let expected = (last.total - last.sent) as f64 / last.bps;
        assert!(
            (last.eta as f64 - expected).abs() <= 1.0 && last.eta >= 2,
            "eta should be believable, got {}s at {} B/s",
            last.eta,
            last.bps
        );
        // 6.4s of transfer at a 250ms cadence: a handful of updates, not 4000.
        assert!(emitted.len() <= 30, "emitted {} updates", emitted.len());
    }

    #[test]
    fn sub_interval_samples_are_withheld_but_still_counted() {
        let mut t = RateTracker::new();
        let t0 = Instant::now();
        sample(&mut t, t0, 0, 10_000);
        assert!(sample(&mut t, t0 + Duration::from_millis(100), 400, 10_000).is_none());
        assert!(sample(&mut t, t0 + Duration::from_millis(200), 800, 10_000).is_none());
        // The withheld bytes belong to this window: 1000 B over the full 1s.
        let s = sample(&mut t, t0 + Duration::from_secs(1), 1000, 10_000).unwrap();
        assert_eq!(s.bps, 1000.0);
        assert_eq!(s.sent, 1000);
    }

    #[test]
    fn a_stall_drags_the_rate_down() {
        let mut t = RateTracker::new();
        let t0 = Instant::now();
        sample(&mut t, t0, 0, 10_000_000);
        let fast = sample(&mut t, t0 + Duration::from_secs(1), 1_000_000, 10_000_000).unwrap();
        assert_eq!(fast.bps, 1_000_000.0);
        // Nothing moves for 10s: the average must fall and the ETA grow.
        let stalled = sample(&mut t, t0 + Duration::from_secs(11), 1_000_000, 10_000_000).unwrap();
        assert!(stalled.bps < 100_000.0, "rate should decay, got {}", stalled.bps);
        assert!(stalled.eta > fast.eta, "eta should grow when the transfer stalls");
    }

    #[test]
    fn completed_keeps_the_file_count() {
        let s = completed(4096, 3);
        assert_eq!(s.file_count, 3);
        assert_eq!(s.percent, 100.0);
        assert_eq!(s.sent, 4096);
        assert_eq!(s.eta, 0);
    }

    #[test]
    fn file_at_maps_bytes_to_the_file_being_moved() {
        let files = vec![("a".to_string(), 100), ("b".to_string(), 50), ("c".to_string(), 10)];
        assert_eq!(file_at(&files, 0), (1, "a".into()));
        assert_eq!(file_at(&files, 99), (1, "a".into()));
        assert_eq!(file_at(&files, 100), (2, "b".into()));
        assert_eq!(file_at(&files, 149), (2, "b".into()));
        assert_eq!(file_at(&files, 150), (3, "c".into()));
        // At (or past) the end, the last file is still the one being finished.
        assert_eq!(file_at(&files, 160), (3, "c".into()));
        assert_eq!(file_at(&[], 5), (0, String::new()));
    }
}
