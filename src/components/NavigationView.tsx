import { useEffect } from 'react';
import { ViewProps, requireNativeComponent, DeviceEventEmitter } from 'react-native';

export type NavigationTurnEvent = {
  direction: string;
  distance: number;
};

export type NavigationViewProps = ViewProps; /*& LocationProps; */

// export type LocationProps = {
//   latitude: number;
//   longitute: number;
//   deviceLongitute: number;
//   deviceLatitude: number;
//   onTurn: (event: NavigationTurnEvent) => void;
// };

const NativeView: React.ComponentType<NavigationViewProps> = requireNativeComponent('RCTNavigationView');

export function NavigationView(props: NavigationViewProps) {
  // useEffect(() => {
  //   const subscription = DeviceEventEmitter.addListener('NavigationTurnEvent', props.onTurn);

  //   return () => subscription.remove();
  // });

  return <NativeView {...props} />;
}
