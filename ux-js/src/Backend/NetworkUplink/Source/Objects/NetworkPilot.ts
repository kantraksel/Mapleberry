import MapPlane from '../../../Map/MapPlane';
import RadarPlane from '../../../LocalRadar/RadarPlane';
import { Pilot } from './LiveNetworkData';
import RefObject from './RefObject';

class NetworkPilot extends RefObject {
    blip: MapPlane;
    pilot: Pilot;
    inMap: boolean;
    local: boolean;
    external?: RadarPlane;

    constructor(pilot: Pilot) {
        super();
        this.pilot = pilot;
        this.inMap = false;
        this.local = false;

        const params = {
            longitude: pilot.longitude,
            latitude: pilot.latitude,
            heading: pilot.heading,
            altitude: pilot.altitude,
            groundAltitude: 0,
            indicatedSpeed: 0,
            groundSpeed: pilot.groundspeed,
            verticalSpeed: 0,
        };
        this.blip = new MapPlane(pilot.callsign, params);
        this.blip.netState = this;
    }
}
export default NetworkPilot;
