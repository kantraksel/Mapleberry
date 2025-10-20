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
                const pilot = this.localPilot;
                if (pilot) {
                    this.connectPlane(pilot, plane);
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
            this.connectPlane(pilot, plane);
        });
        radar.planeRemoved.add(plane => {
            const pilot = plane.blip.netState;
            if (!pilot) {
                return;
            }

            pilot.blip.physicParams = plane.blip.getPhysicParams();
            this.disconnectPlane(pilot, plane);

            if (pilot.local) {
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
            const plane = value.external;
            if (plane) {
                plane.blip.netState = null;
            }
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

            if (pilot.local) {
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
        if (value === this.localCID) {
            return;
        }

        this.localCID = value;
        options.set('vatsim_user_id', value);
        this.updateLocalPlane(value);
    }

    public get userId() {
        return this.localCID;
    }

    public getUser() {
        return this.localPilot;
    }

    private updateLocalPlane(cid: number | undefined) {
        const oldPilot = this.localPilot;
        if (oldPilot) {
            this.disconnectPlane(oldPilot);
            oldPilot.local = false;

            const plane = radar.getByCallsign(oldPilot.pilot.callsign);
            if (plane && !plane.blip.netState) {
                this.connectPlane(oldPilot, plane);
            }
        }

        let pilot;
        if (cid) {
            pilot = this.cache.get(cid);
            if (pilot) {
                this.localPilot = pilot;
                pilot.local = true;
                
                let plane = pilot.external as RadarPlane | undefined | null;
                if (plane) {
                    plane.blip.netState = null;
                }
                pilot.external = undefined;

                plane = tracker.getUser();
                if (plane) {
                    this.connectPlane(pilot, plane);
                }
            }
        }
        this.localPilot = pilot;
        this.UpdateLocal.invoke();
    }

    private connectPlane(pilot: NetworkPilot, plane: RadarPlane) {
        plane.blip.netState = pilot;
        pilot.external = plane;
        this.loseContact(pilot);
    }

    private disconnectPlane(pilot: NetworkPilot, plane?: RadarPlane) {
        if (plane) {
            plane.blip.netState = null;
        } else {
            const plane = pilot.external;
            if (plane) {
                plane.blip.netState = null;
            }
        }
        pilot.external = undefined;
        this.establishContact(pilot);
    }
}

export default TrafficRadar;
