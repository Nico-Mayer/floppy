// Connectivity health: the two pieces of network a transfer depends on, and the
// one place their state is kept. Both are observed passively — the relay from
// the iroh endpoint's own home-relay status, the broker from the connection the
// pairing client already maintains — so nothing here polls or probes.
//
// Health informs, it never gates: two devices on one wifi transfer with no relay
// at all, so a down link is a warning about the likely outcome and not a verdict
// on it. The typed transfer errors stay the only authority on a real failure.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use specta::Type;

/// How long after the endpoint is built a relay may stay unconnected before we
/// call it down. A cold start has no relay for a second or two by design, and an
/// unconnected relay is indistinguishable from one still being picked, so the
/// link stays unknown (and silent) until this passes. `run()` owns the timer that
/// ends the window.
pub const RELAY_GRACE: Duration = Duration::from_secs(8);

/// One link's state. `Unknown` is the launch value and means we have not earned
/// an answer yet — it is neither good nor bad news, and the UI shows nothing for
/// it.
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Default, Type)]
#[serde(rename_all = "lowercase")]
pub enum Link {
    #[default]
    Unknown,
    Up,
    Down,
}

/// Both links at once. Reported whole rather than per-link, so a dropped report
/// cannot leave the frontend holding a mixture of old and new. Crosses the IPC
/// boundary as `events::HealthEvent`, which is the shape with the wire name.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Snapshot {
    pub relay: Link,
    pub broker: Link,
}

/// Where a change goes. Called with a lock released, but still from whatever task
/// observed the change, so it must not block for long.
pub trait Sink: Send + Sync + 'static {
    fn report(&self, snapshot: Snapshot);
}

impl<F> Sink for F
where
    F: Fn(Snapshot) + Send + Sync + 'static,
{
    fn report(&self, snapshot: Snapshot) {
        self(snapshot)
    }
}

/// What the relay link is derived from. The raw observation is kept separate from
/// the state we publish, because "no relay connected" means different things
/// before and after the grace window.
#[derive(Default)]
struct State {
    published: Snapshot,
    relay_connected: bool,
    /// True once a relay has ever connected. After that the grace window is over
    /// for good: a link that has been up reports a later drop at once.
    relay_ever_up: bool,
    /// True once the grace window has elapsed (see `settle_relay`).
    relay_settled: bool,
}

impl State {
    fn relay_link(&self) -> Link {
        if self.relay_connected {
            Link::Up
        } else if self.relay_settled || self.relay_ever_up {
            Link::Down
        } else {
            Link::Unknown
        }
    }
}

/// The one copy of connectivity health. Cheap to clone (an `Arc`).
#[derive(Clone)]
pub struct Health {
    inner: Arc<Inner>,
}

struct Inner {
    state: Mutex<State>,
    sink: Arc<dyn Sink>,
}

impl Health {
    pub fn new(sink: Arc<dyn Sink>) -> Self {
        Health { inner: Arc::new(Inner { state: Mutex::new(State::default()), sink }) }
    }

    /// The current state of both links. What a screen that opens mid-session
    /// starts from, so it is never left waiting for the next change.
    pub fn snapshot(&self) -> Snapshot {
        self.inner.state.lock().unwrap().published
    }

    /// Report whether any home relay is connected. Not-connected before the grace
    /// window has ended leaves the link unknown rather than down.
    pub fn set_relay(&self, connected: bool) {
        self.update(|s| {
            s.relay_connected = connected;
            s.relay_ever_up |= connected;
            s.published.relay = s.relay_link();
        });
    }

    /// End the relay's grace window. From here on, no connected relay means down.
    /// Called once, on a timer, because the endpoint's status watcher only fires
    /// on a change: a relay that never connects would otherwise never be
    /// re-observed and would stay unknown forever.
    pub fn settle_relay(&self) {
        self.update(|s| {
            s.relay_settled = true;
            s.published.relay = s.relay_link();
        });
    }

    /// Report whether this device is registered on the broker. A failed attempt
    /// is an unambiguous answer, so this needs no grace window.
    pub fn set_broker(&self, connected: bool) {
        self.update(|s| {
            s.published.broker = if connected { Link::Up } else { Link::Down };
        });
    }

    /// Apply `change` and report the result, but only if it moved. Restating a
    /// link in the state it already holds is silent — a flapping VPN would
    /// otherwise emit on every observation.
    fn update(&self, change: impl FnOnce(&mut State)) {
        let snapshot = {
            let mut state = self.inner.state.lock().unwrap();
            let before = state.published;
            change(&mut state);
            if state.published == before {
                return;
            }
            state.published
        };
        self.inner.sink.report(snapshot);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A sink that records every report, so a test can assert on how many
    /// arrived, not just on the final state.
    fn recorder() -> (Health, Arc<Mutex<Vec<Snapshot>>>) {
        let log = Arc::new(Mutex::new(Vec::new()));
        let sink = {
            let log = log.clone();
            Arc::new(move |s: Snapshot| log.lock().unwrap().push(s))
        };
        (Health::new(sink), log)
    }

    #[test]
    fn launch_state_is_unknown_and_silent() {
        let (health, log) = recorder();
        assert_eq!(health.snapshot(), Snapshot { relay: Link::Unknown, broker: Link::Unknown });
        assert!(log.lock().unwrap().is_empty());
    }

    #[test]
    fn no_relay_yet_is_not_down() {
        let (health, log) = recorder();
        health.set_relay(false);
        assert_eq!(health.snapshot().relay, Link::Unknown);
        assert!(log.lock().unwrap().is_empty(), "an unresolved relay must say nothing");
    }

    #[test]
    fn relay_is_down_once_the_window_closes() {
        let (health, log) = recorder();
        health.set_relay(false);
        health.settle_relay();
        assert_eq!(health.snapshot().relay, Link::Down);
        assert_eq!(log.lock().unwrap().len(), 1);
    }

    #[test]
    fn a_relay_that_connects_in_time_is_never_down() {
        let (health, log) = recorder();
        health.set_relay(false);
        health.set_relay(true);
        health.settle_relay();
        assert_eq!(health.snapshot().relay, Link::Up);
        let reports = log.lock().unwrap();
        assert_eq!(reports.len(), 1);
        assert_eq!(reports[0].relay, Link::Up);
    }

    #[test]
    fn a_later_drop_needs_no_window() {
        let (health, _log) = recorder();
        health.set_relay(true);
        health.set_relay(false);
        assert_eq!(health.snapshot().relay, Link::Down, "a link that has been up reports a drop");
    }

    #[test]
    fn a_restated_link_is_silent() {
        let (health, log) = recorder();
        health.set_broker(true);
        health.set_broker(true);
        health.set_broker(true);
        assert_eq!(log.lock().unwrap().len(), 1);
    }

    #[test]
    fn the_broker_is_down_on_its_first_failure() {
        let (health, _log) = recorder();
        health.set_broker(false);
        assert_eq!(health.snapshot().broker, Link::Down);
    }

    #[test]
    fn a_report_carries_both_links() {
        let (health, log) = recorder();
        health.set_relay(true);
        health.set_broker(false);
        let reports = log.lock().unwrap();
        assert_eq!(reports.len(), 2);
        // The second report restates the relay rather than describing only the
        // link that moved.
        assert_eq!(reports[1], Snapshot { relay: Link::Up, broker: Link::Down });
    }

    #[test]
    fn the_broker_recovers() {
        let (health, log) = recorder();
        health.set_broker(false);
        health.set_broker(true);
        assert_eq!(health.snapshot().broker, Link::Up);
        assert_eq!(log.lock().unwrap().len(), 2);
    }
}
