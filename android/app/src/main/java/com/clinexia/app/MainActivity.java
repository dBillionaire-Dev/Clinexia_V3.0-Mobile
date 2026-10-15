package com.clinexia.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // In-app updater (real implementation in the "direct" flavor, a no-op stub in "play").
        registerPlugin(UpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
