package stdio

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// swapStderr installs f as os.Stderr for the duration of the test.
func swapStderr(t *testing.T, f *os.File) {
	t.Helper()
	orig := os.Stderr
	t.Cleanup(func() { os.Stderr = orig })
	os.Stderr = f
}

func TestSilenceUnusableStderrReplacesBrokenHandle(t *testing.T) {
	// A closed file is the portable stand-in for the NULL handle a
	// `-H windowsgui` process inherits: writes to it fail the same way.
	f, err := os.Create(filepath.Join(t.TempDir(), "stderr"))
	if err != nil {
		t.Fatal(err)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}
	swapStderr(t, f)

	if _, err := fmt.Fprintln(os.Stderr, "before"); err == nil {
		t.Fatal("closed stderr accepted a write; test cannot prove anything")
	}

	SilenceUnusableStderr()

	if _, err := fmt.Fprintln(os.Stderr, "after"); err != nil {
		t.Fatalf("stderr still unusable: %v", err)
	}
}

func TestSilenceUnusableStderrKeepsWorkingHandle(t *testing.T) {
	path := filepath.Join(t.TempDir(), "stderr")
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { f.Close() })
	swapStderr(t, f)

	SilenceUnusableStderr()

	if os.Stderr != f {
		t.Fatal("replaced a usable stderr")
	}
	if _, err := fmt.Fprint(os.Stderr, "kept"); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "kept" {
		t.Fatalf("stderr wrote %q, want %q", got, "kept")
	}
}
