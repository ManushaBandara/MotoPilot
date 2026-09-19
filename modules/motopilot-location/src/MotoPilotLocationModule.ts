import {
  NativeModule,
  requireNativeModule,
} from "expo";

export type NativeLocation = {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
};

export type LocationUpdateEvent = NativeLocation;

type MotoPilotLocationModuleEvents = {
  onLocationUpdate: (
    event: LocationUpdateEvent
  ) => void;
};

declare class MotoPilotLocationModule extends NativeModule<MotoPilotLocationModuleEvents> {
  startLocationUpdates(): Promise<void>;

  stopLocationUpdates(): Promise<void>;
}

export default requireNativeModule<MotoPilotLocationModule>(
  "MotoPilotLocation"
);