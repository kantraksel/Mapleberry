import { FeatureLike } from "ol/Feature";
import MapPlane from "../Map/MapPlane";
import { NetworkState, Pilot } from "./NetworkWorld";
import RadarPlane from "../Radar/RadarPlane";
import Event from "../Event";
import { RefObject } from "./ControlRadar";

export class NetworkPilot extends RefObject {
    blip: MapPlane;
    pilot: Pilot;
    inMap: boolean;
    external?: RadarPlane;

    constructor(pilot: Pilot) {
        super();
        this.pilot = pilot;
        this.inMap = false;

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

type UpdateLocalEvent = () => void;

class TrafficRadar {
    private planes: Map<string, NetworkPilot>;
    private cache: Map<number, NetworkPilot>;
    private localCID?: number;
    private localPilot?: NetworkPilot;
    public readonly UpdateLocal: Event<UpdateLocalEvent>;

    public constructor() {
        this.planes = new Map();
        this.cache = new Map();
        this.UpdateLocal = new Event();
        this.localCID = options.get<number | undefined>('vatsim_user_id', undefined);

        radar.planeAdded.add(plane => {
            if (plane.main) {
                if (this.localPilot) {
                    const pilot = this.localPilot;
                    this.loseContact(pilot);
                    plane.blip.netState = pilot;
                    pilot.external = plane;

                    this.UpdateLocal.invoke();
                    return;
                }
                //don't match by callsign unless permitted
                return;
            }
            const pilot = this.planes.get(plane.callsign);
            if (!pilot || pilot.external) {
                return;
            }

            this.loseContact(pilot);
            plane.blip.netState = pilot;
            pilot.external = plane;
        });
        radar.planeRemoved.add(plane => {
            const pilot = plane.blip.netState;
            if (!pilot) {
                return;
            }

            pilot.blip.physicParams = plane.blip.getPhysicParams();

            this.establishContact(pilot);
            plane.blip.netState = null;
            pilot.external = undefined;

            if (pilot.pilot.cid === this.localCID) {
                this.UpdateLocal.invoke();
            }
        });

        network.Update.add(data => {
            try {
                if (!data) {
                    this.clear();
                } else {
                    this.onRefresh(data);
                }
            } catch (e: unknown) {
                console.error('Error while updating TrafficRadar:');
                console.error(e);
                this.clear();
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
        this.localPilot = undefined;

        this.UpdateLocal.invoke();
    }

    private establishContact(pilot: NetworkPilot) {
        if (!pilot.inMap) {
            planeLayers.addFarPlane(pilot.blip);
            pilot.inMap = true;
        }
    }

    private loseContact(pilot: NetworkPilot) {
        if (pilot.inMap) {
            planeLayers.removeFarPlane(pilot.blip);
            pilot.inMap = false;
        }
    }

    private onRefresh(data: NetworkState) {
        this.planes.forEach(plane => {
            plane.refCount = 0;
        });

        data.pilots.forEach(pilot => {
            try {
                const callsign = pilot.callsign;

                let plane = this.planes.get(callsign);
                if (!plane) {
                    plane = new NetworkPilot(pilot);
                    this.planes.set(callsign, plane);
                    this.cache.set(pilot.cid, plane);

                    if (pilot.cid === this.localCID) {
                        this.localPilot = plane;
                        const user = tracker.getUser();
                        if (user) {
                            user.blip.netState = plane;
                            plane.external = user;
                        } else {
                            this.establishContact(plane);
                        }
                        this.UpdateLocal.invoke();
                    } else {
                        const radarPlane = radar.getByCallsign(callsign);
                        if (!radarPlane || radarPlane.blip.netState) {
                            this.establishContact(plane);
                        } else {
                            radarPlane.blip.netState = plane;
                            plane.external = radarPlane;
                        }
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
                plane.blip.physicParams = params;
            } catch (e: unknown) {
                console.error(e);
                console.error(`^ was thrown while processing pilot ${pilot.callsign ?? 'INVALID'}/${pilot.cid ?? 'INVALID'}`);
            }
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
                plane.blip.netState = null;
            }

            if (pilot.pilot.cid === this.localCID) {
                this.localPilot = undefined;
                this.UpdateLocal.invoke();
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

    public set userId(value: number | undefined) {
        const changed = value !== this.localCID;

        this.localCID = value;
        options.set('vatsim_user_id', value);

        if (changed) {
            if (value) {
                this.localPilot = this.cache.get(value);
            } else {
                this.localPilot = undefined;
            }
            this.UpdateLocal.invoke();
        }
    }

    public get userId() {
        return this.localCID;
    }

    public getUser() {
        return this.localPilot;
    }
}

export default TrafficRadar;
