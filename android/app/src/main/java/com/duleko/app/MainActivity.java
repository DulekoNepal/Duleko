package com.duleko.app;

import com.getcapacitor.BridgeActivity;

// Deliberately no onCreate() override here: targeting API 36 means Android's
// mandatory edge-to-edge can't be opted out of at the app level anymore
// anyway, so the right move is to let Capacitor's own bridge handle it
// (its bundled SystemBars plugin already listens for the real system-bar
// insets and pads the WebView to match, avoiding the status/gesture-nav
// bar overlap without fighting the platform). See variables.gradle for the
// targetSdkVersion note.
public class MainActivity extends BridgeActivity {}
