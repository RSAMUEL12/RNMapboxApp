package com.lavoie.lavoie_app;

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class NavigationViewManager(
    private val callerContext: ReactApplicationContext
) : SimpleViewManager<MapboxNavigationView>() {

  override fun getName() = REACT_CLASS

  companion object {
    const val REACT_CLASS = "RCTNavigationView"
  }

  // Required for rn built in EventEmitter Calls.
  @ReactMethod
  fun addListener(eventName: String?) {
  }

  @ReactMethod
  fun removeListeners(count: Int?) {
  }

  override fun createViewInstance(context: ThemedReactContext) =
  MapboxNavigationView(      
  context = context)

  override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> {
    return mapOf(
            "topChange" to mapOf(
                    "phasedRegistrationNames" to mapOf(
                            "bubbled" to "onChange"
                    )
            )
    )
  }

  // @ReactProp(name = "latitude", defaultFloat = 0f)
  // fun setLat(view: MapboxNavigationView, latitude: Float) {
  //   view.setLatitude(latitude)
  // }

  // @ReactProp(name = "longitute", defaultFloat = 0f)
  // fun setLng(view: MapboxNavigationView, longitute: Float) {
  //   view.setLongitute(longitute)
  // }

  // @ReactProp(name = "deviceLongitute", defaultFloat = 0f)
  // fun setDeviceLng(view: MapboxNavigationView, deviceLongitute: Float) {
  //   view.seDeviceLongitude(deviceLongitute)
  // }

  // @ReactProp(name = "deviceLatitude", defaultFloat = 0f)
  // fun setDeviceLat(view: MapboxNavigationView, deviceLatitude: Float) {
  //     view.setDeviceLat(deviceLatitude)
  // }

}