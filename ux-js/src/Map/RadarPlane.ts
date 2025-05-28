import MapPlane, { copyPhysicParams, PhysicParams } from "./MapPlane";

interface AnimatorState {
    first: PhysicParams | null;
    second: PhysicParams | null;
    start: number;

    stepLog: PhysicParams[];
    lastStep: PhysicParams | null;
}

class RadarPlane {
    id: number;
    model: string;
    callsign: string;

    inMap: boolean;
    plane: MapPlane;
    animator: AnimatorState;
    main: boolean;

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
            lastStep: null,
        };
        this.main = false;
    }

    setIdent(model: string, callsign: string) {
        this.model = model;
        this.callsign = callsign;
        this.plane.setCallsign(callsign);
    }

    update(data: PhysicParams) {
        const params = copyPhysicParams(data);
        const stepLog = this.animator.stepLog;
        stepLog.push(params);
        if (stepLog.length > 10) {
            stepLog.shift();
        }
    }

    updateAnimation(params: PhysicParams) {
        this.plane.setParams(params);
    }

    tagMain() {
        this.main = true;
        this.plane.setMainStyle();
    }

    restoreStyle() {
        if (this.main) {
            this.plane.setMainStyle();
        } else {
            this.plane.setDefaultStyle();
        }
    }
}

export default RadarPlane;
