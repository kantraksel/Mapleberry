import { FeatureLike } from "ol/Feature";
import MapPlane from "../Map/MapPlane";
import { NetworkState, Pilot } from "./NetworkWorld";
import RadarPlane from "../Radar/RadarPlane";

export class VatsimPlane {
    plane: MapPlane;
    pilot: Pilot;
    inMap: boolean;
    external?: RadarPlane;

    constructor(pilot: Pilot) {
        this.plane = new MapPlane();
        this.pilot = pilot;
        this.inMap = false;

        this.plane.netState = this;
        this.plane.callsign = pilot.callsign;
    }
}

export type PilotEx = Pilot & { plane?: VatsimPlane };

class TrafficRadar {
    private planes: Map<string, VatsimPlane>;

    public constructor() {
        this.planes = new Map();

        radar.planeAdded.add(plane => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            this.loseContact(pilot);
            plane.plane.netState = pilot;
            pilot.external = plane;
        });
        radar.planeRemoved.add(plane => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            const params = plane.plane.getPhysicParams();
            if (params) {
                pilot.plane.physicParams = params;
            }

            this.establishContact(pilot);
            plane.plane.netState = null;
            pilot.external = undefined;
        });

        network.Update.add(data => {
            if (!data) {
                this.clear();
            } else {
                this.onRefresh(data);
            }
        });
    }

    public onSelectStation(e: FeatureLike) {
        const obj = MapPlane.getNetState(e);
        if (obj) {
            cards.showPilotCard(obj.pilot);
            return true;
        }
        return false;
    }

    public clear() {
        this.planes.forEach(value => {
            this.loseContact(value);
        });
        this.planes.clear();
    }

    private establishContact(pilot: VatsimPlane) {
        if (!pilot.inMap) {
            planeLayers.addFarPlane(pilot.plane);
            pilot.inMap = true;
        }
    }

    private loseContact(pilot: VatsimPlane) {
        if (pilot.inMap) {
            planeLayers.removeFarPlane(pilot.plane);
            pilot.inMap = false;
        }
    }

    private onRefresh(data: NetworkState) {
        const planes = this.planes;

        const old_planes = new Map(planes);
        data.pilots.forEach((pilot: PilotEx) => {
            const callsign = pilot.callsign;

            let plane = planes.get(callsign);
            if (!plane) {
                plane = new VatsimPlane(pilot);
                planes.set(callsign, plane);

                const radarPlane = radar.getByCallsign(callsign);
                if (!radarPlane) {
                    this.establishContact(plane);
                } else {
                    radarPlane.plane.netState = plane;
                    plane.external = radarPlane;
                }
            } else {
                plane.pilot = pilot;
                old_planes.delete(callsign);
            }

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
            plane.plane.physicParams = params;
            pilot.plane = plane;
        });

        old_planes.forEach((pilot, callsign) => {
            planes.delete(callsign);
            this.loseContact(pilot);

            const plane = pilot.external;
            if (plane) {
                plane.plane.netState = null;
            }
        });
    }
}

export default TrafficRadar;
