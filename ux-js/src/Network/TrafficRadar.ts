import MapPlane from "../Map/MapPlane";
import { NetworkStations, Pilot } from "./VATSIM";

class VatsimPlane {
    plane: MapPlane;
    pilot: Pilot;
    inMap: boolean;

    constructor(pilot: Pilot) {
        this.plane = new MapPlane();
        this.pilot = pilot;
        this.inMap = false;
    }
}

class TrafficRadar {
    private planes: Map<string, VatsimPlane>;
    private planesById: Map<number, VatsimPlane>;

    public constructor() {
        this.planes = new Map();
        this.planesById = new Map();

        radar.planeAdded.add((plane) => {
            const pilot = this.planes.get(plane.callsign);
            if (!pilot) {
                return;
            }

            this.loseContact(pilot);
            
        });
        radar.planeRemoved.add((plane) => {
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
            const id = MapPlane.getNetId(e);
            if (id === null) {
                return;
            }
            const plane = this.planesById.get(id);
            if (!plane) {
                return;
            }
            cards.showPilotCard(plane.pilot);
        });
    }

    public clear() {
        this.planes.forEach((value) => {
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
        const planesById = this.planesById;
        planesById.clear();

        const old_planes = new Map(planes);
        data.pilots.forEach((pilot: Pilot) => {
            const callsign = pilot.callsign;

            let plane = planes.get(callsign);
            if (!plane) {
                plane = new VatsimPlane(pilot);
                planes.set(callsign, plane);

                plane.plane.setCallsign(callsign);

                if (!radar.isVisible(callsign)) {
                    this.establishContact(plane);
                }
            } else {
                plane.pilot = pilot;
                old_planes.delete(callsign);
            }
            planesById.set(pilot.cid, plane);
            plane.plane.netId = pilot.cid;

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
