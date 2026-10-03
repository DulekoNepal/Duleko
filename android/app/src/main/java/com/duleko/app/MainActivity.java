package com.duleko.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// onCreate only registers the app's own plugin. Edge-to-edge is deliberately
// left alone: targeting API 36 means Android's mandatory edge-to-edge can't be
// opted out of at the app level anymore anyway, so the right move is to let
// Capacitor's own bridge handle it (its bundled SystemBars plugin already
// listens for the real system-bar insets and pads the WebView to match,
// avoiding the status/gesture-nav bar overlap without fighting the
// platform). See variables.gradle for the targetSdkVersion note.
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhoneAlertsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
