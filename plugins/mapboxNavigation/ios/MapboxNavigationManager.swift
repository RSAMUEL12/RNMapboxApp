import UIKit
import MapboxDirections
import MapboxCoreNavigation
import MapboxNavigation
import CoreLocation
import React

enum DirectionError: Error {
  case notLeftOrRight
}

@objc(MapboxNavigation)
class MapboxNavigationClass: RCTEventEmitter {
  var lastDirectionIndexSent: Int? = nil
  let eventName = "handleTurn"

  @objc(startNavigation: longitude: deviceLatitude: deviceLongitude: language: endJourney:)
  func startNavigation(_ latitude:NSNumber, longitude:NSNumber, deviceLatitude:NSNumber, deviceLongitude:NSNumber, language:NSString, endJourney :  @escaping RCTResponseSenderBlock){
    let origin = CLLocationCoordinate2D(latitude: deviceLatitude.doubleValue, longitude: deviceLongitude.doubleValue)
    let destination = CLLocationCoordinate2D(latitude: latitude.doubleValue , longitude: longitude.doubleValue )
    let endJourneyCallback = { (sucess: Bool) in endJourney([sucess]) }
    let routeOptions: RouteOptions = NavigationRouteOptions(coordinates: [origin, destination], profileIdentifier: ProfileIdentifier.cycling)
    routeOptions.locale = Locale(identifier: String(language))

    Directions.shared.calculate(routeOptions) { (session, result) in
      switch result {
      case .failure(_):
        endJourneyCallback(false)
        break;

      case .success(let response):
        let navigationViewController = NavigationViewController(for: response, routeIndex: 0, routeOptions: routeOptions)
        let appDelegate = UIApplication.shared.delegate
        appDelegate!.window!!.rootViewController!.present(navigationViewController, animated: true, completion: nil)
        DispatchQueue.global(qos: .userInitiated).async {
          while(true){
            self.handleManeuver(navigationViewController: navigationViewController)
            if (navigationViewController).isBeingDismissed{
              endJourneyCallback(true)
              break;
            }
          }
        }
        break;
      }
    }
  }

  override func supportedEvents() -> [String]! {
    return [self.eventName];
  }

  private func handleManeuver(navigationViewController: NavigationViewController){
      let remainingSteps = navigationViewController.navigationService?.routeProgress.remainingSteps
      let upcomingManeuverDirection = navigationViewController.navigationService?.routeProgress.upcomingStep?.maneuverDirection
      let upcomingManeuverDistance =
    navigationViewController.navigationService?.routeProgress.currentLegProgress.currentStepProgress.distanceRemaining

      if(upcomingManeuverDirection == nil){
        return
      }

      if(remainingSteps?.count == self.lastDirectionIndexSent){
        return
      }

      do {
        switch upcomingManeuverDirection {
        case .left:
          self.sendEvent( withName: self.eventName, body: ["LEFT", upcomingManeuverDistance] )
          break
        case .right:
          self.sendEvent( withName: self.eventName, body: ["RIGHT", upcomingManeuverDistance] )
          break
        default:
          throw DirectionError.notLeftOrRight
          break
        }
      } catch DirectionError.notLeftOrRight {
        print("Direction sent that was not left or right.")
      } catch {
        print("Unknown error has occurred during runtime.")
      }

      self.lastDirectionIndexSent = remainingSteps?.count
    }
}

