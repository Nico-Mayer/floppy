package transfer

// Kind distinguishes the two transfer directions. The Manager runs at most
// one live transfer per kind.
type Kind uint8

const (
	KindSend Kind = iota
	KindReceive
	kindCount
)

func (k Kind) String() string {
	switch k {
	case KindSend:
		return "send"
	case KindReceive:
		return "receive"
	default:
		return "unknown"
	}
}

// EventType is what happened; the Event carries the type-specific payload.
type EventType uint8

const (
	// EventCode carries the code phrase of a send that is now waiting for
	// its peer. Receives never emit it (they consume a code).
	EventCode EventType = iota
	// EventProgress carries Stats. For a receiver the first one doubles as
	// the manifest: until it arrives the receiver knows nothing about what
	// it is being sent.
	EventProgress
	// EventDone is the terminal success event; Dest is set for receives.
	EventDone
	// EventFailed is the terminal failure event; Err is set. A cancelled
	// transfer emits no terminal event at all — cancellation is something
	// the caller did, not something that happened to it.
	EventFailed
)

// Stats is the payload of EventProgress. Field names are the frontend wire
// contract (they predate this package as croc:*:progress payloads).
type Stats struct {
	Percent int   `json:"percent"`
	Sent    int64 `json:"sent"`
	Total   int64 `json:"total"`
	// Bps is the smoothed transfer rate; 0 until a rate can be measured.
	Bps int64 `json:"bps"`
	// ETA is the estimated number of seconds left, -1 while unknown.
	ETA int `json:"eta"`
	// File is the name of the file currently moving, FileIndex its 1-based
	// place among FileCount files.
	File      string `json:"file"`
	FileIndex int    `json:"fileIndex"`
	FileCount int    `json:"fileCount"`
}

// Event is everything the Manager tells the outside world. ID ties events to
// the transfer that produced them: with cancel-and-retry a stale event can
// otherwise be attributed to the wrong transfer.
type Event struct {
	ID   string
	Kind Kind
	Type EventType

	Code  string // EventCode
	Stats *Stats // EventProgress
	Dest  string // EventDone, receives only
	Err   error  // EventFailed
}

// Emitter receives every event, called from transfer goroutines — it must be
// safe for concurrent use and must not block for long (it gates progress
// polling) or call back into the Manager (it may be invoked with internal
// waits pending).
type Emitter func(Event)
