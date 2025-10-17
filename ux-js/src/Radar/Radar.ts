import { PhysicParams } from "../Map/MapPlane";
import RadarPlane, { RadarPlaneData } from "./RadarPlane";
import RadarAnimator from "./RadarAnimator";
import Event from "../Event";

type RadarPlaneEvent = (plane: RadarPlane) => void;

class Radar {
    private planes: Map<number, RadarPlane>;
    public readonly animator: RadarAnimator;
    public readonly planeAdded: Event<RadarPlaneEvent>;
    public readonly planeRemoved: Event<RadarPlaneEvent>;

    public constructor() {
        this.planes = new Map();
        this.animator = new RadarAnimator();
        this.planeAdded = new Event();
        this.planeRemoved = new Event();
    }

    public add(id: number, data: RadarPlaneData) {
        let plane = this.planes.get(id);
        if (plane) {
            plane.setIdent(data);
        } else {
            plane = new RadarPlane(id, data);
            this.planes.set(id, plane);
        }
        plane.update(data);
        this.animator.start();
        return plane;
    }

    public remove(id: number) {
        const info = this.planes.get(id);
        if (!info) {
            return;
        }
        this.loseRadarContact(info);
        this.planes.delete(info.id);

        if (this.planes.size == 0) {
            this.animator.stop();
        }
    }

    public removeAll() {
        this.planes.forEach((info) => {
            this.loseRadarContact(info);
        });
        this.planes.clear();
        this.animator.stop();
    }

    public update(id: number, data: PhysicParams) {
        const plane = this.planes.get(id);
        if (!plane) {
            return;
        }
        plane.update(data);
        this.animator.start();
    }

    public followPlane(plane: RadarPlane) {
        this.animator.followPlane(plane);
    }

    public forEach(callback: (plane: RadarPlane) => void) {
        this.planes.forEach((value) => {
            callback(value);
        });
    }

    public isVisible(callsign: string) {
        for (const [_, value] of this.planes) {
            if (value.callsign == callsign) {
                return true;
            }
        }

        return false;
    }

    public establishRadarContact(plane: RadarPlane) {
        if (plane.inMap) {
            return;
        }
        plane.inMap = true;
        planeLayers.addPlane(plane.blip);
        this.planeAdded.invoke(plane);
    }

    private loseRadarContact(plane: RadarPlane) {
        if (plane.inMap) {
            plane.inMap = false;
            planeLayers.removePlane(plane.blip);
            this.planeRemoved.invoke(plane);
        }
    }

    public getById(id: number) {
        return this.planes.get(id);
    }

    public getByCallsign(callsign: string) {
        const planes = Array.from(this.planes.values());
        return planes.find(value => value.callsign === callsign);
    }

    public getPlaneList() {
        return Array.from(this.planes.values());
    }
}

export default Radar;
