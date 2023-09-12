#import "React/RCTBridgeModule.h"
#import <React/RCTViewManager.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_REMAP_MODULE(RNMapboxNavigation, MapboxNavigation, RCTEventEmitter)
RCT_EXTERN_METHOD(startNavigation:(NSNumber * _Nonnull)latitude longitude:(NSNumber * _Nonnull)longitude deviceLatitude:(NSNumber * _Nonnull)deviceLatitude deviceLongitude:(NSNumber * _Nonnull)deviceLongitude language:(NSString * _Nonnull)language endJourney: (RCTResponseSenderBlock)endJourney)
@end
