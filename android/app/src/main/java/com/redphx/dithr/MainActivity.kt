package com.redphx.dithr;

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NfcAdapter
import android.os.Bundle
import android.os.Parcelable
import com.getcapacitor.BridgeActivity
import com.redphx.dithr.plugin.EinkIsoDepPlugin


class MainActivity : BridgeActivity() {
    private lateinit var nfcPendingIntent: PendingIntent
    private lateinit var writeTagFilters: Array<IntentFilter>
    private lateinit var nfcAdapter: NfcAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(EinkIsoDepPlugin::class.java)
        super.onCreate(savedInstanceState)

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        val tagDetected = IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED)
        writeTagFilters = arrayOf(tagDetected)

        //When an NFC tag is detected, PendingIntent is used to return to this Activity
        nfcPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_MUTABLE
        )
    }

    override fun onResume() {
        super.onResume()

        nfcAdapter.enableForegroundDispatch(this, nfcPendingIntent, writeTagFilters, null);
    }

    override fun onPause() {
        super.onPause()

        nfcAdapter.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        setIntent(intent)
    }

    @Deprecated("")
    @SuppressLint("MissingSuperCall")
    override fun onBackPressed() {
        // Purposely not calling the super() method to disable the Back button
    }
}
