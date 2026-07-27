// Package stdio repairs the process's standard streams before anything writes
// to them.
package stdio

import "os"

// SilenceUnusableStderr points os.Stderr at the null device when the handle the
// process inherited cannot be written to. Call it once, first thing.
//
// A Windows GUI build is linked with `-H windowsgui`, so the process starts
// without a console and GetStdHandle(STD_ERROR_HANDLE) hands back a NULL
// handle. Go still wraps it as os.Stderr, and every write then fails with
// "write /dev/stderr: The handle is invalid". Most libraries discard that
// error — croc does not. It hashes files through a progressbar whose writer is
// os.Stderr (`io.Copy(io.MultiWriter(hash, bar), f)` in croc's utils), so the
// failed write travels back out of io.Copy and aborts the transfer: sends of
// files over 10 MB, and any receive that re-hashes an existing file. Writing to
// the null device instead makes those writes succeed and vanish.
//
// A build started from a terminal keeps its real stderr, so dev-mode logging is
// untouched.
func SilenceUnusableStderr() {
	// Stat is the portable form of the check that matters: on Windows it calls
	// GetFileType, which is what fails for a NULL handle.
	if _, err := os.Stderr.Stat(); err == nil {
		return
	}
	devNull, err := os.OpenFile(os.DevNull, os.O_WRONLY, 0)
	if err != nil {
		return
	}
	os.Stderr = devNull
}
