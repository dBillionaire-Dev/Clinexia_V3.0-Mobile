package com.clinexia.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * In-app update support for APKs distributed outside Google Play ("direct" flavor only).
 *
 * Privacy: the only request this class makes besides the APK download is the manifest fetch, whose query
 * string carries just versionCode and platform. No personal data or calculator input is ever sent.
 * Safety: HTTPS only, short timeouts, size caps, SHA-256 verified before the file is made installable,
 * the installer is always launched by the user's explicit tap (never silently), and Android itself refuses
 * an update that is not signed with the same key as the installed app.
 */
@CapacitorPlugin(name = "ClinexiaUpdater")
public class UpdaterPlugin extends Plugin {
    private static final String DIR = "updates"; // must match res/xml/file_paths.xml (files-path)
    private static final int TIMEOUT_MS = 8_000;
    private static final int MANIFEST_MAX_BYTES = 64 * 1024;
    private static final long APK_MAX_BYTES = 300L * 1024 * 1024;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Override
    public void load() {
        // Anything left in the update folder at cold start is stale (an installed or abandoned update).
        executor.execute(() -> clearUpdateDir(null));
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", true);
        call.resolve(result);
    }

    /** Fetches version.json over HTTPS. Resolves { body } or rejects (the web layer fails silently). */
    @PluginMethod
    public void fetchManifest(PluginCall call) {
        final String url = call.getString("url");
        final Integer versionCode = call.getInt("versionCode");
        if (url == null || !url.startsWith("https://") || versionCode == null) {
            call.reject("Invalid request", "INVALID_ARGUMENT");
            return;
        }
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String full = url + (url.contains("?") ? "&" : "?") + "versionCode=" + versionCode + "&platform=android";
                conn = (HttpURLConnection) new URL(full).openConnection();
                conn.setConnectTimeout(TIMEOUT_MS);
                conn.setReadTimeout(TIMEOUT_MS);
                conn.setUseCaches(false);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("Accept", "application/json");
                if (conn.getResponseCode() != 200 || !"https".equals(conn.getURL().getProtocol())) {
                    call.reject("Manifest unavailable", "FETCH_FAILED");
                    return;
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                try (InputStream in = conn.getInputStream()) {
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        if (out.size() > MANIFEST_MAX_BYTES) {
                            call.reject("Manifest too large", "FETCH_FAILED");
                            return;
                        }
                    }
                }
                JSObject result = new JSObject();
                result.put("body", out.toString("UTF-8"));
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Manifest unavailable", "FETCH_FAILED");
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    /**
     * Downloads the APK to app-private storage, emitting "downloadProgress" { received, total },
     * and verifies its SHA-256. A mismatch deletes the file and rejects with CHECKSUM_MISMATCH.
     */
    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        final String url = call.getString("url");
        final String expected = Sha256.normalize(call.getString("sha256"));
        final Integer versionCode = call.getInt("versionCode");
        if (url == null || !url.startsWith("https://") || expected == null || versionCode == null) {
            call.reject("Invalid update details", "INVALID_ARGUMENT");
            return;
        }
        executor.execute(() -> {
            File dir = updateDir();
            File part = new File(dir, "clinexia-update-" + versionCode + ".apk.part");
            File finalFile = apkFile(versionCode);
            HttpURLConnection conn = null;
            try {
                clearUpdateDir(null);
                if (!dir.exists() && !dir.mkdirs()) throw new IOException("Cannot create update folder");
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(TIMEOUT_MS);
                conn.setReadTimeout(30_000);
                conn.setInstanceFollowRedirects(true);
                if (conn.getResponseCode() != 200 || !"https".equals(conn.getURL().getProtocol())) {
                    call.reject("Download failed", "DOWNLOAD_FAILED");
                    return;
                }
                long total = conn.getContentLengthLong();
                if (total > APK_MAX_BYTES) {
                    call.reject("Update file is too large", "DOWNLOAD_FAILED");
                    return;
                }
                MessageDigest digest = Sha256.newDigest();
                long received = 0;
                long lastEmit = 0;
                try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        digest.update(buf, 0, n);
                        received += n;
                        if (received > APK_MAX_BYTES) throw new IOException("Update file is too large");
                        long now = System.currentTimeMillis();
                        if (now - lastEmit >= 150) {
                            lastEmit = now;
                            emitProgress(received, total);
                        }
                    }
                }
                emitProgress(received, total);
                if (!Sha256.matches(expected, digest.digest())) {
                    deleteQuietly(part);
                    call.reject("The downloaded file does not match its checksum and was deleted.", "CHECKSUM_MISMATCH");
                    return;
                }
                deleteQuietly(finalFile);
                if (!part.renameTo(finalFile)) throw new IOException("Cannot finalize download");
                call.resolve();
            } catch (Exception e) {
                deleteQuietly(part);
                call.reject("Download failed", "DOWNLOAD_FAILED");
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", canRequestInstalls());
        call.resolve(result);
    }

    /** Deep-links to the "Install unknown apps" screen for Clinexia. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open settings", "SETTINGS_FAILED");
        }
    }

    /** Opens the system package installer for the verified APK. Never installs silently. */
    @PluginMethod
    public void installUpdate(PluginCall call) {
        final Integer versionCode = call.getInt("versionCode");
        if (versionCode == null) {
            call.reject("Invalid request", "INVALID_ARGUMENT");
            return;
        }
        File apk = apkFile(versionCode);
        if (!apk.exists()) {
            call.reject("Update file is missing", "FILE_MISSING");
            return;
        }
        if (!canRequestInstalls()) {
            call.reject("Permission to install apps is required", "INSTALL_PERMISSION");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open the installer", "INSTALL_FAILED");
        }
    }

    /** Deletes downloaded update files (called after a failure or cancel). */
    @PluginMethod
    public void cleanup(PluginCall call) {
        clearUpdateDir(null);
        call.resolve();
    }

    private boolean canRequestInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void emitProgress(long received, long total) {
        JSObject data = new JSObject();
        data.put("received", received);
        data.put("total", total);
        notifyListeners("downloadProgress", data);
    }

    private File updateDir() {
        return new File(getContext().getFilesDir(), DIR);
    }

    private File apkFile(int versionCode) {
        return new File(updateDir(), "clinexia-update-" + versionCode + ".apk");
    }

    private void clearUpdateDir(File keep) {
        File[] files = updateDir().listFiles();
        if (files == null) return;
        for (File f : files) if (keep == null || !f.equals(keep)) deleteQuietly(f);
    }

    private static void deleteQuietly(File f) {
        try {
            if (f.exists() && !f.delete()) f.deleteOnExit();
        } catch (Exception ignored) {
        }
    }
}
