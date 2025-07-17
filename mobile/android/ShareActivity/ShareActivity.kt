/**
 * MiCha Share Activity for Android
 * Handles shared content from other apps
 */

package com.micha.mobile.share

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class ShareActivity : AppCompatActivity() {
    
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val sharedPrefs by lazy { 
        getSharedPreferences("micha_shared_content", MODE_PRIVATE) 
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_share)
        
        setupUI()
        handleIntent()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
    
    private fun setupUI() {
        // Show loading indicator with MiCha branding
        supportActionBar?.hide()
        
        // The layout should show:
        // - MiCha logo
        // - Loading animation
        // - "Processing shared content..." message
    }
    
    private fun handleIntent() {
        when (intent?.action) {
            Intent.ACTION_SEND -> {
                if (intent.type?.startsWith("text/") == true) {
                    handleSendText(intent)
                } else if (intent.type?.startsWith("image/") == true) {
                    handleSendImage(intent)
                }
            }
            Intent.ACTION_VIEW -> {
                handleViewAction(intent)
            }
            else -> {
                showError("Unsupported action")
                finish()
            }
        }
    }
    
    private fun handleSendText(intent: Intent) {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        if (sharedText != null) {
            scope.launch {
                saveSharedContent(SharedContent(
                    type = ContentType.TEXT,
                    content = sharedText,
                    timestamp = System.currentTimeMillis()
                ))
                launchMainApp()
            }
        } else {
            showError("No text to share")
            finish()
        }
    }
    
    private fun handleSendImage(intent: Intent) {
        val imageUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        if (imageUri != null) {
            scope.launch {
                withContext(Dispatchers.IO) {
                    val savedPath = saveImageToInternalStorage(imageUri)
                    saveSharedContent(SharedContent(
                        type = ContentType.IMAGE,
                        content = savedPath,
                        timestamp = System.currentTimeMillis()
                    ))
                }
                launchMainApp()
            }
        } else {
            showError("No image to share")
            finish()
        }
    }
    
    private fun handleViewAction(intent: Intent) {
        val uri = intent.data
        if (uri != null) {
            scope.launch {
                saveSharedContent(SharedContent(
                    type = ContentType.URL,
                    content = uri.toString(),
                    timestamp = System.currentTimeMillis()
                ))
                launchMainApp()
            }
        } else {
            showError("No URL to share")
            finish()
        }
    }
    
    private suspend fun saveImageToInternalStorage(uri: Uri): String = withContext(Dispatchers.IO) {
        val filename = "shared_image_${UUID.randomUUID()}.jpg"
        val file = File(filesDir, filename)
        
        try {
            contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(file).use { output ->
                    input.copyTo(output)
                }
            }
            file.absolutePath
        } catch (e: Exception) {
            throw Exception("Failed to save image: ${e.message}")
        }
    }
    
    private fun saveSharedContent(content: SharedContent) {
        val json = gson.toJson(content)
        sharedPrefs.edit()
            .putString(PENDING_CONTENT_KEY, json)
            .putLong(PENDING_CONTENT_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }
    
    private fun launchMainApp() {
        // Launch main app with special intent
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(EXTRA_FROM_SHARE, true)
        }
        
        if (launchIntent != null) {
            startActivity(launchIntent)
            finish()
            
            // Smooth transition
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        } else {
            showError("Cannot launch MiCha")
            finish()
        }
    }
    
    private fun showError(message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }
    
    companion object {
        const val PENDING_CONTENT_KEY = "pending_shared_content"
        const val PENDING_CONTENT_TIMESTAMP = "pending_shared_content_timestamp"
        const val EXTRA_FROM_SHARE = "from_share_extension"
        
        private val gson = Gson()
    }
}

// Data Models
data class SharedContent(
    val type: ContentType,
    val content: String,
    val timestamp: Long
)

enum class ContentType {
    URL,
    TEXT,
    IMAGE
}

// Extension functions
fun Activity.isFromShareExtension(): Boolean {
    return intent?.getBooleanExtra(ShareActivity.EXTRA_FROM_SHARE, false) == true
}

fun Activity.getPendingSharedContent(): SharedContent? {
    val prefs = getSharedPreferences("micha_shared_content", MODE_PRIVATE)
    val json = prefs.getString(ShareActivity.PENDING_CONTENT_KEY, null) ?: return null
    val timestamp = prefs.getLong(ShareActivity.PENDING_CONTENT_TIMESTAMP, 0)
    
    // Check if content is still fresh (less than 5 minutes old)
    if (System.currentTimeMillis() - timestamp > 5 * 60 * 1000) {
        // Clear old content
        prefs.edit().clear().apply()
        return null
    }
    
    return try {
        Gson().fromJson(json, SharedContent::class.java)
    } catch (e: Exception) {
        null
    }
}