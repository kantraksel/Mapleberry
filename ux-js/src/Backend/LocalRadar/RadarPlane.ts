import MapPlane from "../Map/MapPlane";
import MotionState, { copyMotionState } from "../Map/MotionState";

interface AnimatorState {
    first: MotionState;
    second: MotionState;
    start: number | null;

    stepLog: MotionState[];
    lastStep: MotionState;
}

export interface RadarPlaneData extends MotionState {
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

        const params = copyMotionState(data);
        this.animator = radar.animator.createAnimator(params);

        this.blip = new MapPlane(data.callsign, params);
        this.blip.radarState = this;
    }

    setIdent(data: RadarPlaneData) {
        this.model = data.model;
        this.callsign = data.callsign;
        this.blip.callsign = data.callsign;
    }

    update(data: MotionState) {
        const state = copyMotionState(data);
        const stepLog = this.animator.stepLog;
        stepLog.push(state);
        if (stepLog.length > 10) {
            stepLog.shift();
        }
    }

    updateAnimation(state: MotionState) {
        this.blip.motionState = state;
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
