package com.redphx.dithr.plugin

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Bundle
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.JSValue
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.IOException

@CapacitorPlugin(name = "EinkIsoDep")
class EinkIsoDepPlugin : Plugin() {
    private var activeIsoDep: IsoDep? = null
    private var nfcAdapter: NfcAdapter? = null
    private var isScanningActive = false

    override fun load() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(context)
    }

    @PluginMethod
    fun startScanning(call: PluginCall) {
        val activity = activity
        if (activity == null || nfcAdapter == null) {
            call.reject("NFC Hardware unavailable or Activity context lost.")
            return
        }

        if (isScanningActive) {
            return
        }

        // Execute on UI Thread to safely bind Android ReaderMode
        activity.runOnUiThread {
            try {
                val options = Bundle().apply {
                    // Prevents Android OS from caching the tag properties between physical presentation passes
                    putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 250)
                }

                nfcAdapter?.enableReaderMode(
                    activity,
                    { tag: Tag ->
                        // Exclusive hardware callback lock achieved here
                        activeIsoDep = IsoDep.get(tag)

                        // Fire a real-time event to the JavaScript layer notifying it to execute transceive tasks
                        val event = JSObject().apply {
                            put("status", "detected")
                        }
                        notifyListeners("onTagReady", event)
                    },
                    NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                    options,
                )
                isScanningActive = true
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to engage low-level reader mode.", e)
            }
        }
    }

    @PluginMethod
    fun stopScanning(call: PluginCall) {
        if (!isScanningActive) {
            call.resolve()
            return
        }

        activity?.runOnUiThread {
            nfcAdapter?.disableReaderMode(activity)
            isScanningActive = false
            activeIsoDep = null
            call.resolve()
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val isoDep = activeIsoDep
        if (isoDep == null) {
            call.reject("No active tag handle found. Did you call startScanning first?")
            return
        }

        try {
            if (isoDep.isConnected) {
                isoDep.close()
            }

            isoDep.connect()
            isoDep.timeout = call.getInt("timeout", 50000) ?: 50000 // headroom for E-ink arrays
            call.resolve(JSObject().apply { put("connected", true) })
        } catch (e: IOException) {
            call.reject("Link failure during hardware connection phase.", e)
        }
    }

    @PluginMethod
    fun isConnected(call: PluginCall) {
        val isoDep = activeIsoDep
        if (isoDep == null) {
            call.reject("No active tag handle found. Did you call startScanning first?")
            return
        }

        try {
            call.resolve(JSObject().apply { put("connected", isoDep.isConnected) })
        } catch (e: SecurityException) {
            call.reject("Disconnected")
        }
    }

    @PluginMethod
    fun transceive(call: PluginCall) {
        val isoDep = activeIsoDep
        if (isoDep == null || !isoDep.isConnected) {
            call.reject("Transceiver channel is closed or dead.")
            return
        }

        val dataArray = call.getArray("data") ?: return call.reject("Missing 'data' parameter.")

        try {
            val list = dataArray.toList<Int>()
            val commandBytes = ByteArray(list.size) { i -> list[i].toByte() }

            val responseBytes = isoDep.transceive(commandBytes)

            val responseArray = JSArray().apply {
                for (b in responseBytes) put(b.toInt() and 0xFF)
            }
            call.resolve(JSObject().apply { put("response", responseArray) })
        } catch (e: IOException) {
            call.reject("Tag disconnected or execution timed out during RF transceive.", e)
        }
    }

    @PluginMethod
    fun close(call: PluginCall) {
        try { activeIsoDep?.close() } catch (ignored: Exception) {}
        activeIsoDep = null
        call.resolve(JSObject().apply { put("closed", true) })
    }
}
