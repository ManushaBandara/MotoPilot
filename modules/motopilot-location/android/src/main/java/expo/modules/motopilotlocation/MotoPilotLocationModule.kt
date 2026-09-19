package expo.modules.motopilotlocation

import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MotoPilotLocationModule : Module() {

  private var locationManager: LocationManager? = null
  private var locationListener: LocationListener? = null

  override fun definition() = ModuleDefinition {

    Name("MotoPilotLocation")

    Events("onLocationUpdate")

    AsyncFunction("startLocationUpdates") {

      val context = appContext.reactContext

      if (context == null) {
        throw Exception("React Native context is not available.")
      }

      locationManager =
        context.getSystemService(LocationManager::class.java)

      if (locationManager == null) {
        throw Exception("Android LocationManager is not available.")
      }

      val providers =
  locationManager!!.getProviders(true)

println(
  "MotoPilot GPS: enabled providers = $providers"
)

      // Prevent duplicate listeners.
      stopLocationUpdatesInternal()

      locationListener = object : LocationListener {

        override fun onLocationChanged(location: Location) {

          val payload = bundleOf(
            "latitude" to location.latitude,
            "longitude" to location.longitude,
            "speed" to if (location.hasSpeed()) {
              location.speed
            } else {
              null
            },
            "heading" to if (location.hasBearing()) {
              location.bearing
            } else {
              null
            },
            "accuracy" to if (location.hasAccuracy()) {
              location.accuracy
            } else {
              null
            }
          )

          sendEvent(
            "onLocationUpdate",
            payload
          )
        }

        override fun onProviderEnabled(provider: String) {}

        override fun onProviderDisabled(provider: String) {}

        @Deprecated("Deprecated in Android API")
        override fun onStatusChanged(
          provider: String?,
          status: Int,
          extras: Bundle?
        ) {}
      }

      try {

        locationManager!!.requestLocationUpdates(
          LocationManager.GPS_PROVIDER,
          1000L,
          0f,
          locationListener!!
        )

      } catch (e: SecurityException) {

        locationListener = null

        throw Exception(
          "Location permission was not granted."
        )

      } catch (e: Exception) {

        locationListener = null

        throw Exception(
          e.message ?: "Unable to start GPS updates."
        )
      }
    }

    AsyncFunction("stopLocationUpdates") {
      stopLocationUpdatesInternal()
    }

    OnDestroy {
      stopLocationUpdatesInternal()
    }
  }

  private fun stopLocationUpdatesInternal() {

    val manager = locationManager
    val listener = locationListener

    if (manager != null && listener != null) {
      try {
        manager.removeUpdates(listener)
      } catch (_: Exception) {
        // Ignore cleanup errors.
      }
    }

    locationListener = null
  }
}