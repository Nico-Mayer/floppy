package main

import (
	"os"
	"path/filepath"
	"testing"
)

// TestDescribe covers the three cases the send list depends on: a plain file's
// size, a folder reported as the sum of its contents, and a path that no
// longer exists being skipped instead of failing the batch.
func TestDescribe(t *testing.T) {
	root := t.TempDir()

	file := filepath.Join(root, "payload.bin")
	if err := os.WriteFile(file, make([]byte, 1500), 0o644); err != nil {
		t.Fatal(err)
	}

	dir := filepath.Join(root, "folder")
	nested := filepath.Join(dir, "nested")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	for path, size := range map[string]int{
		filepath.Join(dir, "a.txt"):    100,
		filepath.Join(nested, "b.txt"): 250,
	} {
		if err := os.WriteFile(path, make([]byte, size), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	missing := filepath.Join(root, "gone.bin")
	entries := (&FileService{}).Describe([]string{file, dir, missing})

	if len(entries) != 2 {
		t.Fatalf("got %d entries, want 2 (the missing path should be skipped): %+v", len(entries), entries)
	}
	if got := entries[0]; got.Name != "payload.bin" || got.Size != 1500 || got.IsDir {
		t.Errorf("file entry = %+v, want payload.bin at 1500 bytes, not a dir", got)
	}
	if got := entries[1]; got.Name != "folder" || got.Size != 350 || !got.IsDir {
		t.Errorf("folder entry = %+v, want folder at 350 bytes (100+250), a dir", got)
	}
}
