package expo.modules.motopilotmedia

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.provider.Settings

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MotoPilotMediaModule : Module() {

  private fun getApplicationContext(): Context {
    return appContext.reactContext?.applicationContext
      ?: throw IllegalStateException(
        "MotoPilotMedia application context is not available."
      )
  }

  private fun getMediaSessionManager(): MediaSessionManager {
    val context = getApplicationContext()

    return context.getSystemService(
      Context.MEDIA_SESSION_SERVICE
    ) as MediaSessionManager
  }

  private fun getListenerComponent(): ComponentName {
    return ComponentName(
      getApplicationContext(),
      MotoPilotMediaNotificationListener::class.java
    )
  }

  private fun isNotificationListenerEnabled(): Boolean {
    val context = getApplicationContext()

    val enabledListeners =
      Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      ) ?: return false

    return enabledListeners
      .split(":")
      .mapNotNull { value ->
        try {
          ComponentName.unflattenFromString(value)
        } catch (_: Exception) {
          null
        }
      }
      .any { component ->
        component == getListenerComponent()
      }
  }

  private fun getActiveControllers(): List<MediaController> {
    if (!isNotificationListenerEnabled()) {
      return emptyList()
    }

    return try {
      getMediaSessionManager()
        .getActiveSessions(
          getListenerComponent()
        )
    } catch (_: SecurityException) {
      emptyList()
    }
  }

  private fun getPrimaryController(): MediaController? {
    return getActiveControllers()
      .firstOrNull()
  }

  private fun controllerToMap(
    controller: MediaController
  ): Map<String, Any?> {

    val metadata = controller.metadata

    val title =
      metadata?.getString(
        "android.media.metadata.TITLE"
      )

    val artist =
      metadata?.getString(
        "android.media.metadata.ARTIST"
      )

    val album =
      metadata?.getString(
        "android.media.metadata.ALBUM"
      )

    val duration =
      metadata?.getLong(
        "android.media.metadata.DURATION"
      )

    val playbackState =
      controller.playbackState

    return mapOf(
      "packageName" to controller.packageName,
      "title" to title,
      "artist" to artist,
      "album" to album,
      "durationMs" to duration,
      "playbackState" to (
        playbackState?.state
          ?: android.media.session.PlaybackState.STATE_NONE
      ),
      "positionMs" to (
        playbackState?.position ?: 0L
      )
    )
  }

  private fun openNotificationAccessSettings() {
    val context = getApplicationContext()

    val intent = Intent(
      "android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"
    )

    intent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK
    )

    context.startActivity(intent)
  }

  override fun definition() = ModuleDefinition {

    Name("MotoPilotMedia")

    Function("isMediaAccessEnabled") {
      isNotificationListenerEnabled()
    }

    Function("openMediaAccessSettings") {
      openNotificationAccessSettings()
    }

    Function("getActiveMedia") {
      getActiveControllers()
        .map(::controllerToMap)
    }

    Function("play") {
      getPrimaryController()
        ?.transportControls
        ?.play()
    }

    Function("pause") {
      getPrimaryController()
        ?.transportControls
        ?.pause()
    }

    Function("next") {
      getPrimaryController()
        ?.transportControls
        ?.skipToNext()
    }

    Function("previous") {
      getPrimaryController()
        ?.transportControls
        ?.skipToPrevious()
    }

    Function("seekForward") {
      getPrimaryController()
        ?.transportControls
        ?.fastForward()
    }

    Function("seekBackward") {
      getPrimaryController()
        ?.transportControls
        ?.rewind()
    }
  }
}