// Turns a sequence of raw (bytes-done, total) samples from iroh's progress
// stream into the smoothed rate + ETA the UI shows. Ported from the old Go
// `watchProgress` math — iroh reports byte counts, not speed, so floppy owns
// the smoothing.
//
// No polling and no data race here (the reason this file is small): iroh pushes
// progress events, and this only does arithmetic on them.

use std::time::Instant;

use crate::transport::event::Stats;

/// Weight of the newest rate sample in the running average. Low enough that a
/// bursty or stalled update doesn't make the readout jump around.
const RATE_SMOOTHING: f64 = 0.25;

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

    /// Fold in a new sample and produce the `Stats` to emit. `now` is injected
    /// so tests are deterministic (no wall-clock reads in the hot path).
    pub fn sample(
        &mut self,
        now: Instant,
        done: u64,
        total: u64,
        file: String,
        file_index: u64,
        file_count: u64,
    ) -> Stats {
        // The first sample only establishes a baseline: on a resumed transfer
        // `done` starts at whatever is already held, and dividing that by one
        // interval would invent a gigabyte-per-second rate.
        if let Some(prev) = self.last_sample {
            let dt = now.duration_since(prev).as_secs_f64();
            if dt > 0.0 {
                // Clamped at 0: a file boundary can briefly look like negative
                // progress if the counter resets per file.
                let delta = done.saturating_sub(self.last_sent) as f64;
                let sample = (delta / dt).max(0.0);
                if self.have_rate {
                    self.bps += RATE_SMOOTHING * (sample - self.bps);
                } else {
                    self.bps = sample;
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
        let eta = eta_seconds(remaining, self.bps);

        Stats {
            percent,
            sent: done,
            total,
            bps: self.bps,
            eta,
            file,
            file_index,
            file_count,
        }
    }
}

impl Default for RateTracker {
    fn default() -> Self {
        Self::new()
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
    use std::time::Duration;

    #[test]
    fn first_sample_has_no_rate() {
        let mut t = RateTracker::new();
        let now = Instant::now();
        let s = t.sample(now, 0, 1000, "f".into(), 1, 1);
        assert_eq!(s.bps, 0.0);
        assert_eq!(s.eta, -1);
        assert_eq!(s.percent, 0.0);
    }

    #[test]
    fn rate_and_eta_after_two_samples() {
        let mut t = RateTracker::new();
        let t0 = Instant::now();
        t.sample(t0, 0, 1000, "f".into(), 1, 1);
        // 500 bytes in 1s -> 500 B/s, 500 left -> ~1s ETA.
        let s = t.sample(t0 + Duration::from_secs(1), 500, 1000, "f".into(), 1, 1);
        assert_eq!(s.bps, 500.0);
        assert_eq!(s.eta, 1);
        assert_eq!(s.percent, 50.0);
    }

    #[test]
    fn percent_caps_at_100() {
        let mut t = RateTracker::new();
        let s = t.sample(Instant::now(), 1500, 1000, "f".into(), 1, 1);
        assert_eq!(s.percent, 100.0);
    }
}
