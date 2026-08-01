// Safe areas, one set of CSS variables for every platform.
//
// iOS and desktop need nothing here: WKWebView reports the notch and the home
// indicator through `env(safe-area-inset-*)` (we pair that with viewport-fit=
// cover in app.html and the ios-webview-insets plugin in lib.rs), and on desktop
// env() is simply 0.
//
// Android does need it. Its WebView does not report the status bar or the
// gesture bar through env() at all — below WebView 140 the values are wrong,
// above it they ignore viewport-fit — so MainActivity.kt reads the real insets
// from WindowInsetsCompat and we mirror them onto the document as
// `--android-inset-*`. layout.css reads those first and falls back to env(), so
// the same stylesheet is correct everywhere.

type Insets = { top: number; right: number; bottom: number; left: number }

type Bridge = { get(): string }

const EVENT = 'floppy:safe-area'

function bridge(): Bridge | undefined {
	return (window as unknown as { __floppySafeArea?: Bridge }).__floppySafeArea
}

function apply(insets: Insets) {
	const style = document.documentElement.style
	for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
		style.setProperty(`--android-inset-${edge}`, `${insets[edge]}px`)
	}
}

/**
 * Mirror the native insets onto the document, and keep following them.
 * A no-op off Android. Returns an unsubscribe.
 */
export function watchSafeArea(): () => void {
	const native = bridge()
	if (!native) return () => {}

	// Pull once: the push below fires whenever the window insets change, which
	// can happen before this document exists.
	try {
		apply(JSON.parse(native.get()) as Insets)
	} catch {
		// A malformed payload is not worth breaking startup over; env() stands in.
	}

	const onChange = (e: Event) => apply((e as CustomEvent<Insets>).detail)
	window.addEventListener(EVENT, onChange)
	return () => window.removeEventListener(EVENT, onChange)
}
