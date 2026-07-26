package transfer

import "errors"

// Sentinel errors callers can branch on with errors.Is. Their text is part of
// the wire contract with the frontend (Wails serializes only the message), so
// it must stay stable — see MIGRATION.md.
var (
	// ErrBusy: a transfer of the same kind is already running and was not
	// cancelled. Cancel it first.
	ErrBusy = errors.New("transfer already running")
	// ErrUnwinding: the previous transfer of this kind was cancelled but has
	// not finished stopping within the grace period. Retry shortly.
	ErrUnwinding = errors.New("previous transfer still stopping")
	// ErrNoFiles: Send was called with an empty path list.
	ErrNoFiles = errors.New("no files selected")
	// ErrBadCode: the code phrase is empty or shorter than croc's minimum.
	ErrBadCode = errors.New("invalid code phrase")
)
