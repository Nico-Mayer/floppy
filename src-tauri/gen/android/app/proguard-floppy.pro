# Release builds run R8 (see build.gradle.kts). The safe-area bridge is only
# ever called from JavaScript, so nothing in Kotlin references it and R8 would
# strip it, leaving the page with zero insets on release only.
-keepclassmembers class com.nimayer.floppy.MainActivity$SafeAreaBridge {
    @android.webkit.JavascriptInterface <methods>;
}
