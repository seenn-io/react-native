package io.seenn.reactnative

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.ConcurrentHashMap

/**
 * Seenn Ongoing Notification Module for React Native
 *
 * Provides Android equivalent of iOS Live Activities using ongoing notifications.
 * Notifications are shown with ongoing=true flag, making them persistent and
 * showing at the top of the notification drawer.
 */
class SeennOngoingNotificationModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SeennOngoingNotification"
        const val CHANNEL_ID = "seenn_ongoing_jobs"
        const val CHANNEL_NAME = "Job Progress"
        const val CHANNEL_DESCRIPTION = "Shows progress of running jobs"

        // Notification IDs are generated from job ID hash
        private fun notificationId(jobId: String): Int = jobId.hashCode() and 0x7FFFFFFF
    }

    // Track active notifications
    private val activeNotifications = ConcurrentHashMap<String, NotificationData>()

    data class NotificationData(
        val jobId: String,
        val title: String,
        val progress: Int,
        val status: String,
        val message: String?,
        val stageName: String?,
        val stageIndex: Int?,
        val stageTotal: Int?,
        val startTime: Long
    )

    override fun getName(): String = NAME

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW // Low = no sound, but visible
            ).apply {
                description = CHANNEL_DESCRIPTION
                setShowBadge(false)
            }

            val notificationManager = reactApplicationContext
                .getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    // MARK: - Support Check

    @ReactMethod
    fun isSupported(promise: Promise) {
        // Android 8.0+ supports notification channels
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
    }

    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        val enabled = NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled()
        promise.resolve(enabled)
    }

    @ReactMethod
    fun hasNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            promise.resolve(granted)
        } else {
            // Below Android 13, no runtime permission needed
            promise.resolve(NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled())
        }
    }

    // MARK: - Start Notification

    @ReactMethod
    fun startNotification(params: ReadableMap, promise: Promise) {
        try {
            val jobId = params.getString("jobId") ?: run {
                promise.resolve(createErrorResult("jobId is required"))
                return
            }
            val title = params.getString("title") ?: run {
                promise.resolve(createErrorResult("title is required"))
                return
            }

            val jobType = params.getString("jobType") ?: "job"
            val initialProgress = if (params.hasKey("initialProgress")) params.getInt("initialProgress") else 0
            val initialMessage = params.getString("initialMessage")

            // Check permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val granted = ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED

                if (!granted) {
                    promise.resolve(createErrorResult("Notification permission not granted"))
                    return
                }
            }

            // Create notification data
            val data = NotificationData(
                jobId = jobId,
                title = title,
                progress = initialProgress,
                status = "running",
                message = initialMessage,
                stageName = null,
                stageIndex = null,
                stageTotal = null,
                startTime = System.currentTimeMillis()
            )
            activeNotifications[jobId] = data

            // Show notification
            showNotification(data)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("jobId", jobId)
                putInt("notificationId", notificationId(jobId))
            }
            promise.resolve(result)

        } catch (e: Exception) {
            promise.resolve(createErrorResult(e.message ?: "Unknown error"))
        }
    }

    // MARK: - Update Notification

    @ReactMethod
    fun updateNotification(params: ReadableMap, promise: Promise) {
        try {
            val jobId = params.getString("jobId") ?: run {
                promise.resolve(false)
                return
            }
            val progress = if (params.hasKey("progress")) params.getInt("progress") else 0
            val status = params.getString("status") ?: "running"

            val existingData = activeNotifications[jobId] ?: run {
                promise.resolve(false)
                return
            }

            val message = params.getString("message")
            val stageName = params.getString("stageName")
            val stageIndex = if (params.hasKey("stageIndex")) params.getInt("stageIndex") else null
            val stageTotal = if (params.hasKey("stageTotal")) params.getInt("stageTotal") else null

            val updatedData = existingData.copy(
                progress = progress,
                status = status,
                message = message ?: existingData.message,
                stageName = stageName ?: existingData.stageName,
                stageIndex = stageIndex ?: existingData.stageIndex,
                stageTotal = stageTotal ?: existingData.stageTotal
            )
            activeNotifications[jobId] = updatedData

            showNotification(updatedData)
            promise.resolve(true)

        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // MARK: - End Notification

    @ReactMethod
    fun endNotification(params: ReadableMap, promise: Promise) {
        try {
            val jobId = params.getString("jobId") ?: run {
                promise.resolve(false)
                return
            }
            val finalStatus = params.getString("finalStatus") ?: "completed"
            val finalProgress = if (params.hasKey("finalProgress")) params.getInt("finalProgress") else 100
            val message = params.getString("message")
            val resultUrl = params.getString("resultUrl")
            val errorMessage = params.getString("errorMessage")
            val dismissAfter = if (params.hasKey("dismissAfter")) params.getDouble("dismissAfter").toLong() else 5000L

            val existingData = activeNotifications[jobId]

            // Show final notification (non-ongoing)
            showFinalNotification(
                jobId = jobId,
                title = existingData?.title ?: "Job",
                status = finalStatus,
                progress = finalProgress,
                message = message ?: when (finalStatus) {
                    "completed" -> "Completed"
                    "failed" -> errorMessage ?: "Failed"
                    else -> "Cancelled"
                },
                resultUrl = resultUrl
            )

            // Remove from active
            activeNotifications.remove(jobId)

            // Auto-dismiss after delay
            if (dismissAfter > 0) {
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    cancelNotification(jobId)
                }, dismissAfter)
            }

            promise.resolve(true)

        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // MARK: - Query Notifications

    @ReactMethod
    fun getActiveNotificationIds(promise: Promise) {
        val ids = Arguments.createArray()
        activeNotifications.keys.forEach { ids.pushString(it) }
        promise.resolve(ids)
    }

    @ReactMethod
    fun isNotificationActive(jobId: String, promise: Promise) {
        promise.resolve(activeNotifications.containsKey(jobId))
    }

    // MARK: - Cancel Notifications

    @ReactMethod
    fun cancelNotification(jobId: String, promise: Promise) {
        cancelNotification(jobId)
        promise.resolve(true)
    }

    private fun cancelNotification(jobId: String) {
        activeNotifications.remove(jobId)
        NotificationManagerCompat.from(reactApplicationContext)
            .cancel(notificationId(jobId))
    }

    @ReactMethod
    fun cancelAllNotifications(promise: Promise) {
        activeNotifications.keys.forEach { jobId ->
            NotificationManagerCompat.from(reactApplicationContext)
                .cancel(notificationId(jobId))
        }
        activeNotifications.clear()
        promise.resolve(true)
    }

    // MARK: - Notification Building

    private fun showNotification(data: NotificationData) {
        val context = reactApplicationContext

        // Create content text
        val contentText = buildString {
            if (data.stageName != null && data.stageIndex != null && data.stageTotal != null) {
                append("${data.stageName} (${data.stageIndex}/${data.stageTotal})")
            }
            if (data.message != null) {
                if (isNotEmpty()) append(" - ")
                append(data.message)
            }
            if (isEmpty()) {
                append("${data.progress}%")
            }
        }

        // Get app icon
        val appIcon = context.applicationInfo.icon

        // Create notification
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(appIcon)
            .setContentTitle(data.title)
            .setContentText(contentText)
            .setProgress(100, data.progress, false)
            .setOngoing(true) // Makes it persistent
            .setOnlyAlertOnce(true) // Don't make sound on updates
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        // Add tap action to open app
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            val pendingIntent = PendingIntent.getActivity(
                context,
                notificationId(data.jobId),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.setContentIntent(pendingIntent)
        }

        // Show notification
        try {
            NotificationManagerCompat.from(context)
                .notify(notificationId(data.jobId), builder.build())
        } catch (e: SecurityException) {
            // Permission denied
        }
    }

    private fun showFinalNotification(
        jobId: String,
        title: String,
        status: String,
        progress: Int,
        message: String,
        resultUrl: String?
    ) {
        val context = reactApplicationContext
        val appIcon = context.applicationInfo.icon

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(appIcon)
            .setContentTitle(title)
            .setContentText(message)
            .setOngoing(false) // Allow dismiss
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)

        // Show completed progress or remove progress bar
        when (status) {
            "completed" -> {
                builder.setProgress(100, 100, false)
            }
            "failed" -> {
                builder.setProgress(0, 0, false)
            }
            else -> {
                builder.setProgress(0, 0, false)
            }
        }

        // Add tap action
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            val pendingIntent = PendingIntent.getActivity(
                context,
                notificationId(jobId),
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.setContentIntent(pendingIntent)
        }

        try {
            NotificationManagerCompat.from(context)
                .notify(notificationId(jobId), builder.build())
        } catch (e: SecurityException) {
            // Permission denied
        }
    }

    private fun createErrorResult(error: String): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("success", false)
            putString("error", error)
        }
    }

    // Send events to JS
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
