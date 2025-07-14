import MapPlane from "../Map/MapPlane";
import { NetworkStations, Pilot } from "./VATSIM";

export class VatsimPlane {
    plane: MapPlane;
    pilot: Pilot;
    inMap: boolean;

    constructor(pilot: Pilot) {
        this.plane = new MapPlane();
        this.pilot = pilot;
        this.inMap = false;

        this.plane.netState = this;
        this.plane.setCallsign(pilot.callsign);
    }
}

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
            
        });
        radar.planeRemoved.add(plane => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            const params = plane.plane.getParams();
            if (params) {
                pilot.plane.setParams(params);
            }

            this.establishContact(pilot);
        });

        vatsim.Update.add(data => {
            if (!data) {
                this.clear();
            } else {
                this.onRefresh(data);
            }
        });

        map.clickEvent.add(e => {
            const obj = MapPlane.getNetState(e[0]);
            if (obj) {
                cards.showPilotCard(obj.pilot);
            }
        });
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

    private onRefresh(data: NetworkStations) {
        const planes = this.planes;

        const old_planes = new Map(planes);
        data.pilots.forEach(pilot => {
            const callsign = pilot.callsign;

            let plane = planes.get(callsign);
            if (!plane) {
                plane = new VatsimPlane(pilot);
                planes.set(callsign, plane);

                if (!radar.isVisible(callsign)) {
                    this.establishContact(plane);
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
            plane.plane.setParams(params);
        });

        old_planes.forEach((pilot, callsign) => {
            planes.delete(callsign);
            this.loseContact(pilot);
        });
    }
}

export default TrafficRadar;
