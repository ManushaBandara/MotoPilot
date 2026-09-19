package expo.modules.motopilotmedia

import android.service.notification.NotificationListenerService

class MotoPilotMediaNotificationListener :
  NotificationListenerService() {

  companion object {
    @Volatile
    var instance: MotoPilotMediaNotificationListener? = null
      private set
  }

  override fun onListenerConnected() {
    super.onListenerConnected()

    instance = this
  }

  override fun onListenerDisconnected() {
    instance = null

    super.onListenerDisconnected()
  }

  override fun onDestroy() {
    instance = null

    super.onDestroy()
  }
}