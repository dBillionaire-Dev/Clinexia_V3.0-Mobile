package com.clinexia.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.junit.Test;

public class Sha256Test {
    private static final String ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    private static final String EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    @Test public void hashesKnownVectors() throws Exception {
        assertEquals(ABC, Sha256.hashStream(new ByteArrayInputStream("abc".getBytes(StandardCharsets.UTF_8))));
        assertEquals(EMPTY, Sha256.hashStream(new ByteArrayInputStream(new byte[0])));
    }

    @Test public void matchesIgnoresCaseAndWhitespace() throws Exception {
        MessageDigest md = Sha256.newDigest();
        byte[] digest = md.digest("abc".getBytes(StandardCharsets.UTF_8));
        assertTrue(Sha256.matches(ABC, digest));
        assertTrue(Sha256.matches("  " + ABC.toUpperCase() + "\n", digest));
    }

    @Test public void rejectsMismatchAndMalformedValues() throws Exception {
        byte[] digest = Sha256.newDigest().digest("abc".getBytes(StandardCharsets.UTF_8));
        assertFalse(Sha256.matches(EMPTY, digest));
        assertFalse(Sha256.matches("deadbeef", digest));
        assertFalse(Sha256.matches(null, digest));
        assertNull(Sha256.normalize(ABC.substring(1)));
        assertNull(Sha256.normalize(ABC.replace('a', 'z')));
    }

    @Test public void largeInputStreamsInChunks() throws Exception {
        byte[] data = new byte[300_000];
        for (int i = 0; i < data.length; i++) data[i] = (byte) (i % 251);
        String expected = Sha256.toHex(Sha256.newDigest().digest(data));
        assertEquals(expected, Sha256.hashStream(new ByteArrayInputStream(data)));
    }
}
