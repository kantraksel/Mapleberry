import MapPlane, { copyPhysicParams, PhysicParams } from "./MapPlane";

interface AnimatorState {
    first: PhysicParams | null;
    second: PhysicParams | null;
    start: number;

    stepLog: PhysicParams[];
}

class RadarPlane {
    id: number;
    model: string;
    callsign: string;

    inMap: boolean;
    plane: MapPlane;
    animator: AnimatorState;

    constructor(id: number, model: string, callsign: string) {
        this.id = id;
        this.model = model;
        this.callsign = callsign;

        this.inMap = false;
        this.plane = new MapPlane();
        this.plane.userObject = this;
        this.plane.setCallsign(callsign);

        this.animator = {
            first: null,
            second: null,
            start: 0,
            stepLog: [],
        };
    }

    setIdent(model: string, callsign: string) {
        this.model = model;
        this.callsign = callsign;
        this.plane.setCallsign(callsign);
    }

    update(data: PhysicParams) {
        const params = copyPhysicParams(data);
        this.animator.stepLog.push(params);
    }

    updateAnimation(params: PhysicParams) {
        this.plane.setParams(params);

        if (!this.inMap) {
            this.inMap = true;
            planeLayers.addPlane(this.plane);
        }
    }

    deleteFromMap() {
        if (this.inMap) {
            planeLayers.removePlane(this.plane);
        }
    }
}

export default RadarPlane;
