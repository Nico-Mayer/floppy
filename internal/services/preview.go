package services

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	_ "image/gif" // decode-only: registers the GIF reader for image.Decode
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// --- Mobile port notes -------------------------------------------------------
//
// This file is pure Go (stdlib image only, no cgo), so it compiles for
// android/arm64 and ios/arm64 unchanged, and the /localfile route, the ETag/
// max-age caching, the size gate, and the glyph fallback all port as-is.
//
// Two things do NOT port and are deliberately left for later:
//   - Paths. os.Open cannot touch an Android content:// URI or an iOS
//     security-scoped URL. croc has the same problem (it needs bytes to send),
//     so the picker will have to copy into the sandbox regardless; previews then
//     run on the sandbox copy for free.
//   - Budgets. thumbMaxSourcePixels and decodeSlots are desktop-shaped. A 48MP
//     phone photo allocates ~192MB RGBA and gets a low-memory build killed, so a
//     mobile build wants the cap near 12–16M px and decodeSlots at 1. The proper
//     mobile answer is the platform thumbnail API (Android
//     ContentResolver.loadThumbnail, iOS PHImageManager) behind this same route
//     — cached, downscaled, orientation-corrected, HEIC-capable for near-free.
// -----------------------------------------------------------------------------

// LocalFilePreviewRoute is the asset-server path that serves a queued file to
// the webview so its FileCard can render a thumbnail. The frontend builds the
// URL as `/localfile?path=<absolute path>`.
const LocalFilePreviewRoute = "/localfile"

// previewExts are the image types worth handing to the webview as a queue
// thumbnail — the formats a supported webview decodes on its own. Anything else
// keeps its glyph.
var previewExts = map[string]bool{
	".png":  true,
	".jpg":  true,
	".jpeg": true,
	".gif":  true,
	".webp": true,
	".avif": true,
	".bmp":  true,
	".svg":  true,
	".ico":  true,
}

// thumbnailExts are the subset the Go standard library can decode, so a
// downscaled thumbnail can be built here instead of shipping the original.
// The rest are streamed as-is: adding a decoder for them (x/image for webp and
// bmp, a rasteriser for svg, nothing at all for avif) costs more than it saves,
// since the formats a user queues 20MB of are png and jpeg.
var thumbnailExts = map[string]bool{
	".png":  true,
	".jpg":  true,
	".jpeg": true,
	".gif":  true,
}

const (
	// Longest edge of a generated thumbnail. A queue tile is 150–200px wide, so
	// this still has room to spare on a 2x display.
	thumbMaxDim = 384
	// Files this small are streamed untouched — re-encoding them would cost a
	// decode to save nothing, and could only make them look worse.
	thumbMinSourceBytes = 256 << 10
	// Refuse to decode beyond this many pixels. A 20MB jpeg is ~24M pixels and
	// already needs ~96MB as a bitmap; past this the allocation is a worse
	// problem than the missing preview, and the tile falls back to its glyph.
	// Desktop-shaped — a mobile build wants this far lower (see port notes).
	thumbMaxSourcePixels = 80 << 20
)

// decodeSlots caps how many thumbnail decodes run at once. A webview requests
// every tile in a grid in parallel (~6 at a time), and each decode holds the
// whole source bitmap in memory; unbounded, a screen of large photos spikes to
// gigabytes. Two in flight keeps the pipe busy while bounding the peak. A mobile
// build wants this at 1 (see port notes).
var decodeSlots = make(chan struct{}, 2)

// LocalFilePreviewMiddleware serves image previews for queued files off disk.
// Everything it can serve is a file the user picked to send, so it opens no new
// read surface — but it still refuses anything that is not an existing regular
// file with a known image extension, so a stray request cannot turn the asset
// server into a general-purpose file reader. All other paths fall through to
// the embedded frontend.
//
// Anything large enough to be worth it is downscaled here rather than sent
// whole: the webview decodes an image at full resolution regardless of the size
// it is painted at, so a queue of 20MB photos would otherwise cost hundreds of
// megabytes of bitmap to draw a row of 180px tiles.
func LocalFilePreviewMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != LocalFilePreviewRoute {
			next.ServeHTTP(w, r)
			return
		}
		path := r.URL.Query().Get("path")
		ext := strings.ToLower(filepath.Ext(path))
		if !previewExts[ext] {
			http.Error(w, "unsupported preview type", http.StatusForbidden)
			return
		}
		info, err := os.Stat(path)
		if err != nil || !info.Mode().IsRegular() {
			http.NotFound(w, r)
			return
		}

		// A thumbnail is derived data, and building one means decoding the whole
		// original — worth caching for the session so switching panels does not
		// redo it. The validator covers everything the output depends on, so an
		// edited file (new size or mtime) misses, and so does a change to
		// thumbMaxDim. The URL is the rest of the key: it carries the path.
		etag := fmt.Sprintf(`"%x-%x-%x"`, info.ModTime().UnixNano(), info.Size(), thumbMaxDim)
		w.Header().Set("ETag", etag)
		w.Header().Set("Cache-Control", "private, max-age=300")
		// Checked before the decode rather than left to ServeContent, which is the
		// point: a revalidation should not pay for a thumbnail it already has.
		if strings.Contains(r.Header.Get("If-None-Match"), etag) {
			w.WriteHeader(http.StatusNotModified)
			return
		}

		f, err := os.Open(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer f.Close()

		if thumbnailExts[ext] && info.Size() > thumbMinSourceBytes {
			// A format we can read that is big enough to be worth shrinking. On any
			// surprise — truncated file, a png feature the decoder rejects — fall
			// through to streaming the original, which the webview may still render.
			// The slot is held only across the decode, not the network write, so a
			// slow client cannot starve other tiles.
			thumb, name, err := func() ([]byte, string, error) {
				decodeSlots <- struct{}{}
				defer func() { <-decodeSlots }()
				return thumbnail(f, info.Name())
			}()
			switch err {
			case nil:
				http.ServeContent(w, r, name, info.ModTime(), bytes.NewReader(thumb))
				return
			case errTooManyPixels:
				http.Error(w, "image too large to preview", http.StatusForbidden)
				return
			}
			if _, err := f.Seek(0, io.SeekStart); err != nil {
				http.NotFound(w, r)
				return
			}
		}
		http.ServeContent(w, r, info.Name(), info.ModTime(), f)
	})
}

var errTooManyPixels = fmt.Errorf("image exceeds %d pixels", thumbMaxSourcePixels)

// thumbnail decodes r and returns a downscaled copy of it, plus a filename whose
// extension tells ServeContent which Content-Type to send. An animated gif comes
// back as its first frame, which is all a static tile can show anyway.
func thumbnail(r io.ReadSeeker, name string) ([]byte, string, error) {
	// Phone photos are almost always stored unrotated with an EXIF Orientation
	// flag; stdlib's decoders ignore it, so without this the tile comes out
	// sideways. Read it first, off the raw stream, then rewind for the decoders.
	orient := jpegOrientation(r)
	if _, err := r.Seek(0, io.SeekStart); err != nil {
		return nil, "", err
	}
	// The pixel cap has to be read before the decode allocates for it, which is
	// what DecodeConfig is for; the decoders then need the stream rewound.
	cfg, _, err := image.DecodeConfig(r)
	if err != nil {
		return nil, "", err
	}
	if int64(cfg.Width)*int64(cfg.Height) > thumbMaxSourcePixels {
		return nil, "", errTooManyPixels
	}
	if _, err := r.Seek(0, io.SeekStart); err != nil {
		return nil, "", err
	}
	src, _, err := image.Decode(r)
	if err != nil {
		return nil, "", err
	}

	// Orient after downscaling — the rotation copies every pixel, and there are
	// far fewer of them once the image is thumbnail-sized.
	dst := applyOrientation(boxDownscale(src, thumbMaxDim), orient)
	var buf bytes.Buffer
	// jpeg has no alpha, so a transparent source has to stay png or its
	// background turns black. Deciding from the scaled result rather than the
	// source's type is both exact and cheap — it is a handful of kilobytes.
	if opaque(dst) {
		if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 80}); err != nil {
			return nil, "", err
		}
		return buf.Bytes(), name + ".jpg", nil
	}
	if err := png.Encode(&buf, dst); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), name + ".png", nil
}

// boxDownscale scales src down until neither side exceeds max, averaging each
// destination pixel over the block of source pixels it covers. Nearest-neighbour
// would alias badly on a photo; a box filter is the cheapest thing that does
// not, and at thumbnail size nothing sharper is distinguishable. An image
// already within max is copied at its own size.
func boxDownscale(src image.Image, max int) *image.RGBA {
	b := src.Bounds()
	sw, sh := b.Dx(), b.Dy()
	dw, dh := sw, sh
	switch {
	case sw >= sh && sw > max:
		dw, dh = max, sh*max/sw
	case sh > sw && sh > max:
		dw, dh = sw*max/sh, max
	}
	dw, dh = clampMin1(dw), clampMin1(dh)

	dst := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for dy := range dh {
		y0, y1 := b.Min.Y+dy*sh/dh, b.Min.Y+(dy+1)*sh/dh
		for dx := range dw {
			x0, x1 := b.Min.X+dx*sw/dw, b.Min.X+(dx+1)*sw/dw
			// RGBA() is alpha-premultiplied, which is what makes a plain average
			// correct here — averaging un-premultiplied colour would halo wherever
			// alpha varies. image.RGBA stores premultiplied too, so nothing has to
			// be converted back.
			var sr, sg, sb, sa, n uint64
			for y := y0; y < y1; y++ {
				for x := x0; x < x1; x++ {
					r, g, bl, a := src.At(x, y).RGBA()
					sr, sg, sb, sa, n = sr+uint64(r), sg+uint64(g), sb+uint64(bl), sa+uint64(a), n+1
				}
			}
			i := dst.PixOffset(dx, dy)
			dst.Pix[i+0] = uint8(sr / n >> 8)
			dst.Pix[i+1] = uint8(sg / n >> 8)
			dst.Pix[i+2] = uint8(sb / n >> 8)
			dst.Pix[i+3] = uint8(sa / n >> 8)
		}
	}
	return dst
}

func clampMin1(v int) int {
	if v < 1 {
		return 1
	}
	return v
}

func opaque(m *image.RGBA) bool {
	for i := 3; i < len(m.Pix); i += 4 {
		if m.Pix[i] != 0xff {
			return false
		}
	}
	return true
}

// jpegOrientation returns the EXIF Orientation value (1..8) of a jpeg stream, or
// 1 ("no transform") for anything that is not a jpeg, carries no EXIF, or is
// malformed — every failure path degrades to "leave it as decoded" rather than
// erroring, since a mis-rotated preview beats no preview. Only jpeg is handled:
// png and gif have no orientation flag, and croc-queued photos that carry one
// are jpeg. Pure stdlib, so it ports to mobile as-is.
func jpegOrientation(r io.Reader) int {
	var sig [2]byte
	if _, err := io.ReadFull(r, sig[:]); err != nil || sig[0] != 0xFF || sig[1] != 0xD8 {
		return 1 // not a jpeg (SOI marker absent)
	}
	var hdr [4]byte
	for {
		// Each segment is 0xFF, a marker byte, then a 2-byte big-endian length
		// that includes those length bytes but not the marker.
		if _, err := io.ReadFull(r, hdr[:2]); err != nil || hdr[0] != 0xFF {
			return 1
		}
		switch hdr[1] {
		case 0xD9, 0xDA: // EOI, or SOS: image data begins, no metadata past here
			return 1
		}
		if _, err := io.ReadFull(r, hdr[2:4]); err != nil {
			return 1
		}
		length := int(binary.BigEndian.Uint16(hdr[2:4]))
		if length < 2 {
			return 1
		}
		body := make([]byte, length-2)
		if _, err := io.ReadFull(r, body); err != nil {
			return 1
		}
		if hdr[1] == 0xE1 && len(body) >= 6 && string(body[:6]) == "Exif\x00\x00" {
			return orientationFromTIFF(body[6:])
		}
	}
}

// orientationFromTIFF reads the Orientation tag (0x0112) out of the TIFF block
// that follows the "Exif\0\0" header in a jpeg APP1 segment. Returns 1 on any
// structural surprise.
func orientationFromTIFF(b []byte) int {
	if len(b) < 8 {
		return 1
	}
	var bo binary.ByteOrder
	switch string(b[:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return 1
	}
	ifd := int(bo.Uint32(b[4:8])) // byte offset of IFD0 from the TIFF header start
	if ifd < 0 || ifd+2 > len(b) {
		return 1
	}
	for i, n := 0, int(bo.Uint16(b[ifd:])); i < n; i++ {
		// Each 12-byte entry: tag(2) type(2) count(4) value(4). A SHORT value sits
		// left-aligned in the value field, so the first 2 bytes hold it.
		e := ifd + 2 + i*12
		if e+12 > len(b) {
			return 1
		}
		if bo.Uint16(b[e:]) == 0x0112 {
			if v := int(bo.Uint16(b[e+8:])); v >= 1 && v <= 8 {
				return v
			}
			return 1
		}
	}
	return 1
}

// applyOrientation returns src transformed so an EXIF Orientation of o displays
// upright. o==1 (and anything out of range) returns src untouched. Orientations
// 5–8 transpose the axes, so the result's width and height swap.
func applyOrientation(src *image.RGBA, o int) *image.RGBA {
	if o <= 1 || o > 8 {
		return src
	}
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	dw, dh := w, h
	if o >= 5 { // 5,6,7,8 swap axes
		dw, dh = h, w
	}
	dst := image.NewRGBA(image.Rect(0, 0, dw, dh))
	for y := range h {
		for x := range w {
			// Forward map: where source pixel (x,y) lands in the upright image.
			var nx, ny int
			switch o {
			case 2: // mirror horizontal
				nx, ny = w-1-x, y
			case 3: // rotate 180
				nx, ny = w-1-x, h-1-y
			case 4: // mirror vertical
				nx, ny = x, h-1-y
			case 5: // transpose
				nx, ny = y, x
			case 6: // rotate 90 CW
				nx, ny = h-1-y, x
			case 7: // transverse
				nx, ny = h-1-y, w-1-x
			case 8: // rotate 90 CCW
				nx, ny = y, w-1-x
			}
			si := src.PixOffset(b.Min.X+x, b.Min.Y+y)
			di := dst.PixOffset(nx, ny)
			copy(dst.Pix[di:di+4], src.Pix[si:si+4])
		}
	}
	return dst
}
