package com.lavoie.lavoie_app;

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.Resources
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.mapbox.api.directions.v5.models.RouteOptions
import com.mapbox.geojson.Point
import com.mapbox.maps.MapView
import com.mapbox.maps.plugin.LocationPuck2D
import com.mapbox.maps.plugin.locationcomponent.location
import com.mapbox.navigation.base.extensions.applyDefaultNavigationOptions
import com.mapbox.navigation.base.extensions.applyLanguageAndVoiceUnitOptions
import com.mapbox.navigation.base.formatter.DistanceFormatterOptions
import com.mapbox.navigation.base.options.NavigationOptions
import com.mapbox.navigation.base.route.NavigationRoute
import com.mapbox.navigation.base.route.NavigationRouterCallback
import com.mapbox.navigation.base.route.RouterFailure
import com.mapbox.navigation.base.route.RouterOrigin
import com.mapbox.navigation.core.MapboxNavigation
import com.mapbox.navigation.core.directions.session.RoutesObserver
import com.mapbox.navigation.core.formatter.MapboxDistanceFormatter
import com.mapbox.navigation.core.lifecycle.MapboxNavigationApp
import com.mapbox.navigation.core.lifecycle.MapboxNavigationObserver
import com.mapbox.navigation.core.lifecycle.requireMapboxNavigation
import com.mapbox.navigation.core.replay.MapboxReplayer
import com.mapbox.navigation.core.replay.ReplayLocationEngine
import com.mapbox.navigation.core.replay.route.ReplayProgressObserver
import com.mapbox.navigation.core.replay.route.ReplayRouteMapper
import com.mapbox.navigation.core.trip.session.RouteProgressObserver
import com.mapbox.navigation.ui.maneuver.api.MapboxManeuverApi
import com.mapbox.navigation.ui.maneuver.view.MapboxManeuverView
import com.mapbox.navigation.ui.maps.location.NavigationLocationProvider
import com.mapbox.navigation.ui.maps.route.arrow.api.MapboxRouteArrowApi
import com.mapbox.navigation.ui.maps.route.arrow.api.MapboxRouteArrowView
import com.mapbox.navigation.ui.maps.route.arrow.model.RouteArrowOptions
import com.mapbox.navigation.ui.maps.route.line.api.MapboxRouteLineApi
import com.mapbox.navigation.ui.maps.route.line.api.MapboxRouteLineView
import com.mapbox.navigation.ui.maps.route.line.model.MapboxRouteLineOptions
import com.mapbox.navigation.ui.shield.model.RouteShieldCallback
import java.util.*

class MapboxNavigationView(context: Context) : LinearLayout(context) {
    private val inflater = context.getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
    private val view = inflater.inflate(R.layout.mapbox_activity_navigation_view, this, true)

    private var mapView: MapView = view.findViewById(R.id.mapView)
    /**
     * Debug tool used to play, pause and seek route progress events that can be used to produce mocked location updates along the route.
     */
    private val mapboxReplayer = MapboxReplayer()

    /**
     * Debug tool that mocks location updates with an input from the [mapboxReplayer].
     */
    private val replayLocationEngine = ReplayLocationEngine(mapboxReplayer)

    /**
     * Debug observer that makes sure the replayer has always an up-to-date information to generate mock updates.
     */
    private val replayProgressObserver = ReplayProgressObserver(mapboxReplayer)

    /**
     * [NavigationLocationProvider] is a utility class that helps to provide location updates generated by the Navigation SDK
     * to the Maps SDK in order to update the user location indicator on the map.
     */
    private val navigationLocationProvider = NavigationLocationProvider()

    private val options: MapboxRouteLineOptions by lazy {
        MapboxRouteLineOptions.Builder(context)
            /**
             * Remove this line and [onPositionChangedListener] if you don't wish to show the
             * vanishing route line feature
             */
            .withVanishingRouteLineEnabled(true)
//            .withRouteLineBelowLayerId("road-label-navigation")
            .build()
    }

    private val routeLineApi: MapboxRouteLineApi by lazy {
        MapboxRouteLineApi(options)
    }

    private val routeLineView by lazy {
        MapboxRouteLineView(options)
    }

    private val routesObserver = RoutesObserver { routeUpdateResult ->
        Log.d("Debug", "Route Update Result")
        Log.d("Debug", routeUpdateResult.toString())
        if (routeUpdateResult.navigationRoutes.isNotEmpty()) {
// generate route geometries asynchronously and render them
            routeLineApi.setNavigationRoutes(
                routeUpdateResult.navigationRoutes
            ) { value ->
                mapView.getMapboxMap().getStyle()?.apply {
                    Log.d("Debug", this.toString())
                    routeLineView.renderRouteDrawData(this, value)
                }
            }

// update the camera position to account for the new route
//            viewportDataSource.onRouteChanged(routeUpdateResult.navigationRoutes.first())
//            viewportDataSource.evaluate()
        } else {
// remove the route line and route arrow from the map
            val style = mapView.getMapboxMap().getStyle()
            if (style != null) {
                routeLineApi.clearRouteLine { value ->
                    routeLineView.renderClearRouteLineValue(
                        style,
                        value
                    )
                }
//                routeArrowView.render(style, routeArrowApi.clearArrows())
            }

// remove the route reference from camera position evaluations
//            viewportDataSource.clearRouteData()
//            viewportDataSource.evaluate()
        }
    }

    private fun initNavigation() {
        MapboxNavigationApp.setup(
            NavigationOptions.Builder(context)
                .accessToken("pk.eyJ1IjoibGF2b2llYXBwIiwiYSI6ImNsOHgyYnd6NDAwOWozcHBjamVqdjM0Ym0ifQ.cybw1I3zgjnLSlqXFYEFtQ")
// comment out the location engine setting block to disable simulation
                .locationEngine(replayLocationEngine)
                .build()
        )

// initialize location puck
        mapView.location.apply {
            setLocationProvider(navigationLocationProvider)
            this.locationPuck = LocationPuck2D(
                bearingImage = ContextCompat.getDrawable(
                    context,
                    R.drawable.mapbox_navigation_puck_icon
                )
            )
            enabled = true
        }
    }

    private fun replayOriginLocation() {
        mapboxReplayer.pushEvents(
            listOf(
                ReplayRouteMapper.mapToUpdateLocation(
                    Date().time.toDouble(),
                    Point.fromLngLat(-122.39726512303575, 37.785128345296805)
                )
            )
        )
        mapboxReplayer.playFirstLocation()
        mapboxReplayer.playbackSpeed(3.0)
    }

    private val mapboxNavigation: MapboxNavigation by ((context as ReactContext).currentActivity as AppCompatActivity).requireMapboxNavigation(
        onResumedObserver = object : MapboxNavigationObserver {
            @SuppressLint("MissingPermission")
            override fun onAttached(mapboxNavigation: MapboxNavigation) {
                mapboxNavigation.registerRoutesObserver(routesObserver)
                mapboxNavigation.registerRouteProgressObserver(replayProgressObserver)
// start the trip session to being receiving location updates in free drive
// and later when a route is set also receiving route progress updates
                Log.d("Debug", "Starting Trip Session...")
                mapboxNavigation.startTripSession()
                Log.d("Debug", "Trip Session Started.")
            }

            override fun onDetached(mapboxNavigation: MapboxNavigation) {
                mapboxNavigation.registerRoutesObserver(routesObserver)
                mapboxNavigation.unregisterRouteProgressObserver(replayProgressObserver)
            }
        },
        onInitialize = this::initNavigation
    )

    private fun setRouteAndStartNavigation(routes: List<NavigationRoute>) {
// set routes, where the first route in the list is the primary route that
// will be used for active guidance
        Log.d("Debug", routes.toString())
        mapboxNavigation.setNavigationRoutes(routes)

    }

    init {
        orientation = HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL

        mapboxNavigation.requestRoutes(
            RouteOptions.builder()
                .applyDefaultNavigationOptions()
                .applyLanguageAndVoiceUnitOptions(context)
                .coordinatesList(listOf(Point.fromLngLat(-0.1444703, 51.501364), Point.fromLngLat(-0.0688034, 51.6042205)))
                .layersList(listOf(mapboxNavigation.getZLevel(), null))
                .build(),
            object : NavigationRouterCallback {
                override fun onCanceled(routeOptions: RouteOptions, routerOrigin: RouterOrigin) {
// no impl
                }

                override fun onFailure(reasons: List<RouterFailure>, routeOptions: RouteOptions) {
                    Log.d("Debug", "Route Creation Failed")
                    Log.d("Debug", reasons.toString())
                }

                override fun onRoutesReady(
                    routes: List<NavigationRoute>,
                    routerOrigin: RouterOrigin
                ) {
                    setRouteAndStartNavigation(routes)
                }
            }
        )
    }



}