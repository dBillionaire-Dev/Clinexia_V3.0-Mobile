package com.clinexia.app;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** SHA-256 helpers for verifying a downloaded APK. Pure Java (no Android classes) so it is unit-testable. */
final class Sha256 {
    private Sha256() {}

    private static final char[] HEX = "0123456789abcdef".toCharArray();

    static MessageDigest newDigest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String toHex(byte[] bytes) {
        char[] out = new char[bytes.length * 2];
        for (int i = 0; i < bytes.length; i++) {
            out[i * 2] = HEX[(bytes[i] >> 4) & 0xF];
            out[i * 2 + 1] = HEX[bytes[i] & 0xF];
        }
        return new String(out);
    }

    /** Lower-cased 64-char hex, or null when the input is not a SHA-256 hex string. */
    static String normalize(String value) {
        if (value == null) return null;
        String v = value.trim().toLowerCase(java.util.Locale.ROOT);
        if (v.length() != 64) return null;
        for (int i = 0; i < v.length(); i++) {
            char c = v.charAt(i);
            boolean ok = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
            if (!ok) return null;
        }
        return v;
    }

    /** True when the digest matches the expected hex string (compared in constant time). */
    static boolean matches(String expectedHex, byte[] digest) {
        String expected = normalize(expectedHex);
        if (expected == null || digest == null) return false;
        return MessageDigest.isEqual(expected.getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                toHex(digest).getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    }

    static String hashStream(InputStream in) throws IOException {
        MessageDigest md = newDigest();
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        return toHex(md.digest());
    }

    static String hashFile(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            return hashStream(in);
        }
    }
}
