import MapPlane, { copyPhysicParams, PhysicParams } from "../Map/MapPlane";

interface AnimatorState {
    first: PhysicParams;
    second: PhysicParams;
    start: number | null;

    stepLog: PhysicParams[];
    lastStep: PhysicParams;
}

export interface RadarPlaneData extends PhysicParams {
    model: string;
    callsign: string;
}

class RadarPlane {
    id: number;
    model: string;
    callsign: string;

    inMap: boolean;
    blip: MapPlane;
    animator: AnimatorState;
    main: boolean;

    constructor(id: number, data: RadarPlaneData) {
        this.id = id;
        this.model = data.model;
        this.callsign = data.callsign;
        this.inMap = false;
        this.main = false;

        const params = copyPhysicParams(data);
        this.animator = radar.animator.createAnimator(params);

        this.blip = new MapPlane(data.callsign, params);
        this.blip.radarState = this;
    }

    setIdent(data: RadarPlaneData) {
        this.model = data.model;
        this.callsign = data.callsign;
        this.blip.callsign = data.callsign;
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
        this.blip.physicParams = params;
    }

    tagMain() {
        this.main = true;
        this.blip.setMainStyle();
    }

    restoreStyle() {
        if (this.main) {
            this.blip.setMainStyle();
        } else {
            this.blip.setDefaultStyle();
        }
    }
}

export default RadarPlane;
