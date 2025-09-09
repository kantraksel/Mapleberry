import { FeatureLike } from "ol/Feature";
import MapPlane from "../Map/MapPlane";
import { NetworkState, Pilot } from "./NetworkWorld";
import RadarPlane from "../Radar/RadarPlane";

export class NetworkPilot {
    plane: MapPlane;
    pilot: Pilot;
    inMap: boolean;
    external?: RadarPlane;
    refCount: number;

    constructor(pilot: Pilot) {
        this.plane = new MapPlane();
        this.pilot = pilot;
        this.inMap = false;
        this.refCount = 1;

        this.plane.netState = this;
        this.plane.callsign = pilot.callsign;
    }

    addRef() {
        this.refCount++;
    }

    expired() {
        return this.refCount <= 0;
    }
}

class TrafficRadar {
    private planes: Map<string, NetworkPilot>;
    private cache: Map<number, NetworkPilot>;

    public constructor() {
        this.planes = new Map();
        this.cache = new Map();

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
            cards.showPilotCard(obj);
            return true;
        }
        return false;
    }

    public isInteractable(e: FeatureLike) {
        const obj = MapPlane.getNetState(e);
        if (obj) {
            return true;
        }
        return false;
    }

    public clear() {
        this.planes.forEach(value => {
            this.loseContact(value);
        });
        this.planes.clear();
        this.cache.clear();
    }

    private establishContact(pilot: NetworkPilot) {
        if (!pilot.inMap) {
            planeLayers.addFarPlane(pilot.plane);
            pilot.inMap = true;
        }
    }

    private loseContact(pilot: NetworkPilot) {
        if (pilot.inMap) {
            planeLayers.removeFarPlane(pilot.plane);
            pilot.inMap = false;
        }
    }

    private onRefresh(data: NetworkState) {
        this.planes.forEach(plane => {
            plane.refCount = 0;
        });

        data.pilots.forEach(pilot => {
            const callsign = pilot.callsign;

            let plane = this.planes.get(callsign);
            if (!plane) {
                plane = new NetworkPilot(pilot);
                this.planes.set(callsign, plane);
                this.cache.set(pilot.cid, plane);

                const radarPlane = radar.getByCallsign(callsign);
                if (!radarPlane) {
                    this.establishContact(plane);
                } else {
                    radarPlane.plane.netState = plane;
                    plane.external = radarPlane;
                }
            } else {
                plane.pilot = pilot;
                plane.addRef();
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
        });

        this.planes.forEach((pilot, callsign) => {
            if (!pilot.expired()) {
                return;
            }
            this.planes.delete(callsign);
            this.cache.delete(pilot.pilot.cid);
            this.loseContact(pilot);

            const plane = pilot.external;
            if (plane) {
                plane.plane.netState = null;
            }
        });
    }

    public getPilotList() {
        return Array.from(this.planes.values());
    }

    public findPilot(pilot: NetworkPilot) {
        return this.planes.get(pilot.pilot.callsign);
    }

    public findPilotById(cid: number) {
        return this.cache.get(cid);
    }
}

export default TrafficRadar;
