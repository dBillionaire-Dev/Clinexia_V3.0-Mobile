package com.clinexia.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Google Play build: the in-app updater is not compiled in (Play forbids self-updating outside Play)
 * and REQUEST_INSTALL_PACKAGES is not declared. The web layer asks isEnabled() and shows nothing.
 */
@CapacitorPlugin(name = "ClinexiaUpdater")
public class UpdaterPlugin extends Plugin {
    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", false);
        call.resolve(result);
    }
}
