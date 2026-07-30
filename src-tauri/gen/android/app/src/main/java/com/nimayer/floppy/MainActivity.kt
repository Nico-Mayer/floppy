package com.nimayer.floppy

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

// Edge-to-edge is on (and mandatory from targetSdk 35), so the webview paints
// behind the status and navigation bars. Android's WebView will not tell the
// page where those bars are: below WebView 140 `env(safe-area-inset-*)` returns
// wrong values, above it the values ignore `viewport-fit`. So we read the real
// insets from WindowInsetsCompat and hand them over as CSS variables instead.
// The frontend reads them variable-first with `env()` behind them, which is
// what iOS and desktop use (see layout.css and safe-area.svelte.ts).
class MainActivity : TauriActivity() {
  /** The last insets we saw, in CSS pixels, already shaped as JSON. */
  private var insets = """{"top":0,"right":0,"bottom":0,"left":0}"""

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    // Pull, for the first paint: a push would race the document into existence,
    // so the page asks for the current values itself once it has mounted.
    webView.addJavascriptInterface(SafeAreaBridge(), "__floppySafeArea")

    // Push, for everything after: rotation, gesture bar vs. button bar, and the
    // keyboard opening over the navigation bar.
    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, windowInsets ->
      val bars = windowInsets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime())
      val density = view.resources.displayMetrics.density
      // The keyboard covers the navigation bar rather than stacking on top of
      // it, so the bottom inset is the taller of the two, not their sum.
      val bottom = maxOf(bars.bottom, ime.bottom) / density
      insets = """{"top":${bars.top / density},"right":${bars.right / density},""" +
        """"bottom":$bottom,"left":${bars.left / density}}"""
      (view as WebView).evaluateJavascript(
        "window.dispatchEvent(new CustomEvent('floppy:safe-area',{detail:$insets}))",
        null
      )
      windowInsets
    }
    ViewCompat.requestApplyInsets(webView)
  }

  /** Reachable from the page as `window.__floppySafeArea.get()`. */
  private inner class SafeAreaBridge {
    @JavascriptInterface
    fun get(): String = insets
  }
}
