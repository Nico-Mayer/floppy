package services

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/png"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

// fallthroughBody is what the wrapped handler writes, so a test can tell "the
// middleware declined this request" apart from "the middleware served it".
const fallthroughBody = "frontend"

// get runs one request through the middleware. Header is a func so a test can
// set If-None-Match; nil for the common case.
func get(t *testing.T, path string, header func(*http.Request)) *httptest.ResponseRecorder {
	t.Helper()
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(fallthroughBody))
	})
	target := LocalFilePreviewRoute + "?path=" + url.QueryEscape(path)
	r := httptest.NewRequest(http.MethodGet, target, nil)
	if header != nil {
		header(r)
	}
	rec := httptest.NewRecorder()
	LocalFilePreviewMiddleware(next).ServeHTTP(rec, r)
	return rec
}

// writeNoisePNG writes a png of the given size whose pixels are random, so it
// does not compress down past thumbMinSourceBytes the way flat colour would.
// alpha applies to every pixel: 0xff for an opaque image.
func writeNoisePNG(t *testing.T, name string, w, h int, alpha uint8) string {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	rnd := rand.New(rand.NewSource(1))
	for i := 0; i < len(img.Pix); i += 4 {
		img.Pix[i+0] = uint8(rnd.Intn(256))
		img.Pix[i+1] = uint8(rnd.Intn(256))
		img.Pix[i+2] = uint8(rnd.Intn(256))
		img.Pix[i+3] = alpha
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode source: %v", err)
	}
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, buf.Bytes(), 0o600); err != nil {
		t.Fatalf("write source: %v", err)
	}
	return path
}

func TestPreviewDownscalesLargeImage(t *testing.T) {
	path := writeNoisePNG(t, "big.png", 1000, 120, 0xff)
	source, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(source) <= thumbMinSourceBytes {
		t.Fatalf("test source is %d bytes, needs to exceed thumbMinSourceBytes (%d) to be thumbnailed", len(source), thumbMinSourceBytes)
	}

	rec := get(t, path, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	got, format, err := image.Decode(bytes.NewReader(rec.Body.Bytes()))
	if err != nil {
		t.Fatalf("decode response: %v", err)
	}
	// Opaque source, so it should come back as jpeg — the smaller of the two.
	if format != "jpeg" {
		t.Errorf("format = %q, want jpeg", format)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/jpeg" {
		t.Errorf("Content-Type = %q, want image/jpeg", ct)
	}
	// 1000x120 capped at 384 on the long edge, aspect ratio held. Wide and short
	// keeps the pixel count (and so the -race runtime of the resample) small while
	// still clearing thumbMinSourceBytes.
	if w, h := got.Bounds().Dx(), got.Bounds().Dy(); w != thumbMaxDim || h != thumbMaxDim*120/1000 {
		t.Errorf("thumbnail is %dx%d, want %dx%d", w, h, thumbMaxDim, thumbMaxDim*120/1000)
	}
	if rec.Body.Len() >= len(source) {
		t.Errorf("thumbnail is %d bytes, source was %d — no saving", rec.Body.Len(), len(source))
	}
}

func TestPreviewKeepsAlphaAsPNG(t *testing.T) {
	// jpeg cannot carry alpha, so a transparent source has to stay png or the
	// tile shows a black box where the page should show through.
	rec := get(t, writeNoisePNG(t, "alpha.png", 1000, 120, 0x80), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("Content-Type = %q, want image/png", ct)
	}
	got, _, err := image.Decode(bytes.NewReader(rec.Body.Bytes()))
	if err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if _, _, _, a := got.At(0, 0).RGBA(); a == 0xffff {
		t.Error("thumbnail is opaque, want the source's alpha preserved")
	}
}

func TestPreviewStreamsSmallImageUntouched(t *testing.T) {
	// Under thumbMinSourceBytes: re-encoding buys nothing, so the bytes on the
	// wire should be exactly the bytes on disk.
	path := writeNoisePNG(t, "small.png", 24, 24, 0xff)
	source, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(source) > thumbMinSourceBytes {
		t.Fatalf("test source is %d bytes, needs to stay under thumbMinSourceBytes (%d)", len(source), thumbMinSourceBytes)
	}
	rec := get(t, path, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if !bytes.Equal(rec.Body.Bytes(), source) {
		t.Errorf("body is %d bytes, want the source's %d unchanged", rec.Body.Len(), len(source))
	}
}

func TestPreviewStreamsFormatsGoCannotDecode(t *testing.T) {
	// .webp is previewable (the webview decodes it) but not in thumbnailExts, so
	// it has to reach the client whole rather than 404 or fall through.
	path := filepath.Join(t.TempDir(), "photo.webp")
	body := bytes.Repeat([]byte("webp"), thumbMinSourceBytes) // past the size gate
	if err := os.WriteFile(path, body, 0o600); err != nil {
		t.Fatal(err)
	}
	rec := get(t, path, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if rec.Body.Len() != len(body) {
		t.Errorf("body is %d bytes, want the source's %d", rec.Body.Len(), len(body))
	}
}

func TestPreviewStreamsUndecodableSource(t *testing.T) {
	// A .png the decoder chokes on: the thumbnail attempt has to fall back to
	// streaming rather than turning into an error, since the webview's decoder
	// may still cope.
	path := filepath.Join(t.TempDir(), "truncated.png")
	body := bytes.Repeat([]byte{0}, thumbMinSourceBytes+1)
	if err := os.WriteFile(path, body, 0o600); err != nil {
		t.Fatal(err)
	}
	rec := get(t, path, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if rec.Body.Len() != len(body) {
		t.Errorf("body is %d bytes, want the source's %d", rec.Body.Len(), len(body))
	}
}

func TestPreviewRefusesTooManyPixels(t *testing.T) {
	// Dimensions are taken from the header, so this never allocates the bitmap it
	// is describing — which is the whole point of the cap.
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		t.Fatal(err)
	}
	b := buf.Bytes()
	// PNG layout: 8-byte signature, then IHDR as length[8:12], type[12:16],
	// width[16:20], height[20:24], … , CRC[29:33] over type+data.
	binary.BigEndian.PutUint32(b[16:20], 20000)
	binary.BigEndian.PutUint32(b[20:24], 20000)
	binary.BigEndian.PutUint32(b[29:33], crc32.ChecksumIEEE(b[12:29]))
	// Trailing bytes after IEND are ignored by the decoder but count towards the
	// file size, which is what has to clear the size gate for the cap to be hit.
	b = append(b, bytes.Repeat([]byte{0}, thumbMinSourceBytes+1)...)

	path := filepath.Join(t.TempDir(), "huge.png")
	if err := os.WriteFile(path, b, 0o600); err != nil {
		t.Fatal(err)
	}
	if rec := get(t, path, nil); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403 for %d pixels", rec.Code, 20000*20000)
	}
}

func TestPreviewRevalidatesWithoutRebuilding(t *testing.T) {
	path := writeNoisePNG(t, "cached.png", 1000, 120, 0xff)
	first := get(t, path, nil)
	etag := first.Header().Get("ETag")
	if etag == "" {
		t.Fatal("no ETag on the first response")
	}
	second := get(t, path, func(r *http.Request) { r.Header.Set("If-None-Match", etag) })
	if second.Code != http.StatusNotModified {
		t.Errorf("status = %d, want 304", second.Code)
	}
	if second.Body.Len() != 0 {
		t.Errorf("304 carried %d bytes of body", second.Body.Len())
	}
}

func TestPreviewRejectsNonImageAndMissing(t *testing.T) {
	dir := t.TempDir()
	notAnImage := filepath.Join(dir, "secrets.txt")
	if err := os.WriteFile(notAnImage, []byte("private"), 0o600); err != nil {
		t.Fatal(err)
	}
	if rec := get(t, notAnImage, nil); rec.Code != http.StatusForbidden {
		t.Errorf("status = %d for a non-image extension, want 403", rec.Code)
	}
	if rec := get(t, filepath.Join(dir, "gone.png"), nil); rec.Code != http.StatusNotFound {
		t.Errorf("status = %d for a missing file, want 404", rec.Code)
	}
	if rec := get(t, dir+string(filepath.Separator)+"..", nil); rec.Code == http.StatusOK {
		t.Error("a directory path was served")
	}
}

func TestOrientationFromTIFF(t *testing.T) {
	// Little-endian ("II") TIFF with a single IFD0 entry: Orientation (0x0112),
	// type SHORT, count 1, value 6.
	b := []byte{
		'I', 'I', 0x2A, 0x00, // byte order + magic
		0x08, 0x00, 0x00, 0x00, // IFD0 at offset 8
		0x01, 0x00, // entry count = 1
		0x12, 0x01, // tag 0x0112
		0x03, 0x00, // type SHORT
		0x01, 0x00, 0x00, 0x00, // count 1
		0x06, 0x00, 0x00, 0x00, // value 6
	}
	if got := orientationFromTIFF(b); got != 6 {
		t.Errorf("orientation = %d, want 6", got)
	}
	if got := orientationFromTIFF([]byte("garbage")); got != 1 {
		t.Errorf("garbage orientation = %d, want 1 (fallback)", got)
	}
}

func TestApplyOrientation(t *testing.T) {
	// A 2x1 image: red at (0,0), blue at (1,0). Orientation 6 (rotate 90 CW)
	// should produce a 1x2 image with red on top and blue below.
	src := image.NewRGBA(image.Rect(0, 0, 2, 1))
	red := [4]byte{0xff, 0, 0, 0xff}
	blue := [4]byte{0, 0, 0xff, 0xff}
	copy(src.Pix[src.PixOffset(0, 0):], red[:])
	copy(src.Pix[src.PixOffset(1, 0):], blue[:])

	dst := applyOrientation(src, 6)
	if w, h := dst.Bounds().Dx(), dst.Bounds().Dy(); w != 1 || h != 2 {
		t.Fatalf("dims = %dx%d, want 1x2 (axes swapped)", w, h)
	}
	if got := dst.Pix[dst.PixOffset(0, 0) : dst.PixOffset(0, 0)+4]; !bytes.Equal(got, red[:]) {
		t.Errorf("top pixel = %v, want red %v", got, red)
	}
	if got := dst.Pix[dst.PixOffset(0, 1) : dst.PixOffset(0, 1)+4]; !bytes.Equal(got, blue[:]) {
		t.Errorf("bottom pixel = %v, want blue %v", got, blue)
	}

	// Orientation 1 is a no-op and returns the same backing image.
	if applyOrientation(src, 1) != src {
		t.Error("orientation 1 should return src untouched")
	}
}

func TestPreviewPassesOtherRoutesThrough(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(fallthroughBody))
	})
	rec := httptest.NewRecorder()
	LocalFilePreviewMiddleware(next).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/index.html", nil))
	if rec.Body.String() != fallthroughBody {
		t.Errorf("body = %q, want the wrapped handler's %q", rec.Body.String(), fallthroughBody)
	}
}
