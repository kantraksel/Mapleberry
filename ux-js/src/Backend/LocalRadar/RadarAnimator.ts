import { FeatureLike } from "ol/Feature";
import MapPlane from "../Map/MapPlane";
import RadarPlane, { AnimatorState } from "./RadarPlane";
import MotionState from "../Map/MotionState";

function roundTime(n: number) {
    return Math.round(n * 10) / 10;
}

class RadarAnimator {
    private animatorId: number | null;
    private trackedId: number;
    private lastAutoRes: number;
    private minimumDeltaTime: number;
    private lastAnimationTimestamp: number;
    private mapEnabled: boolean;
    private mapScalingEnabled: boolean;
    private interpolationEnabled: boolean;

    public constructor() {
        this.animatorId = null;
        this.trackedId = -1;
        this.lastAutoRes = NaN;
        this.minimumDeltaTime = 100;
        this.lastAnimationTimestamp = 0;
        this.mapEnabled = map.visible;

        this.mapScalingEnabled = options.get<boolean>('radar_follow_scale_map', true);
        this.interpolationEnabled = options.get<boolean>('radar_interpolate', true);

        this.adjustUpdateRate();

        map.clickEvent.add(e => {
            const obj = MapPlane.getRadarState(e[0]);
            if (obj) {
                this.followPlane(obj);
            }
        });

        map.moveStartEvent.add(() => {
            this.unfollowPlane();
        });

        map.changeResEvent.add(value => {
            this.adjustUpdateRate(value);

            if (Number.isNaN(this.lastAutoRes)) {
                return;
            }

            const epsilon = 0.5;
            const min = value - epsilon;
            const max = value + epsilon;
            if (this.lastAutoRes < min || this.lastAutoRes > max) {
                this.lastAutoRes = NaN;
            }
        });

        map.visibilityEvent.add((visible) => {
            this.mapEnabled = visible;
        });
    }

    public isInteractable(e: FeatureLike) {
        const obj = MapPlane.getRadarState(e);
        if (obj) {
            return true;
        }
        return false;
    }

    public start() {
        if (this.animatorId !== null) {
            return;
        }

        const fn = (timestamp: number) => {
            let activeEntities = 0;

            if (roundTime(timestamp - this.lastAnimationTimestamp) < this.minimumDeltaTime) {
                this.animatorId = requestAnimationFrame(fn);
                return;
            }
            this.lastAnimationTimestamp = timestamp;

            radar.forEach(blip => {
                const data = blip.animator;
                if (data.start === null) {
                    data.start = timestamp;
                }

                let params;
                if (this.interpolationEnabled) {
                    params = this.processInterpolated(timestamp, data);
                } else {
                    params = this.processRealtime(timestamp, data);
                }

                if (this.mapEnabled) {
                    blip.updateAnimation(params);
                }
                
                if (!blip.inMap) {
                    radar.establishRadarContact(blip);
                }

                if (this.mapEnabled && blip.id == this.trackedId) {
                    // fixes scroll not working when following plane on high resolution map
                    if (params.longitude != data.lastStep.longitude || params.latitude != data.lastStep.latitude) {
                        this.moveMapWithPlane(params);
                    }
                }
                data.lastStep = params;

                activeEntities++;
            });

            if (activeEntities > 0) {
                this.animatorId = requestAnimationFrame(fn);
            } else {
                this.animatorId = null;
            }
        };
        this.animatorId = requestAnimationFrame(fn);
    }

    private processInterpolated(timestamp: number, data: AnimatorState) {
        let time = roundTime(timestamp - data.start!);
        if (time >= 1000) {
            const stepLog = data.stepLog;
            if (stepLog.length >= 2) {
                time = roundTime(time % 1000);

                const i = stepLog.length - 2;
                data.first = stepLog[i];
                data.second = stepLog[i + 1];
                data.start = roundTime(timestamp - time);

                data.stepLog = [ data.second ];
            }
        }

        const n = MathClamp(roundTime(time / 1000), 0, 2);
        return lerpMotion(data.first, data.second, n);
    }

    private processRealtime(timestamp: number, data: AnimatorState) {
        const stepLog = data.stepLog;
        if (stepLog.length >= 2) {
            const i = stepLog.length - 1;
            const step = stepLog[i];

            data.first = step;
            data.second = step;
            data.stepLog = [ step ];
            data.start = timestamp;
        }
        return data.second;
    }

    private moveMapWithPlane(info: MotionState) {
        const altitude = info.groundAltitude;
        const absAlt = info.altitude;
        const speed = info.groundSpeed;
        const longitude = info.longitude;
        const latitude = info.latitude;

        let resolution;
        if (Number.isNaN(this.lastAutoRes)) {
            map.setCenterZoom(longitude, latitude);
            return;
        }
        
        if (altitude < 2000) {
            if (speed < 20) {
                resolution = 5;
            } else if (speed < 50) {
                resolution = ((speed - 20) / 30) * 5 + 5; // 5-10
            } else {
                resolution = (altitude / 2000) * 10 + 10; // 10-20
            }
        } else if (altitude < 5000) {
            resolution = ((altitude - 2000) / 3000) * 20 + 20; // 20-40
        } else if (altitude < 10000) {
            resolution = ((altitude - 5000) / 5000) * 60 + 40; // 40-100
        } else if (absAlt < 15000) {
            resolution = 10000 - (altitude - absAlt);
            resolution = ((absAlt - resolution) / (15000 - resolution)) * 100 + 100; // 100-200
        } else {
            resolution = 200;
        }
        this.lastAutoRes = resolution;

        map.setCenterZoom(longitude, latitude, resolution);
    }

    public stop() {
        if (this.animatorId === null) {
            return;
        }

        cancelAnimationFrame(this.animatorId);
        this.animatorId = null;
    }

    public followPlane(plane: RadarPlane) {
        if (this.trackedId === plane.id) {
            return;
        }

        if (this.trackedId != -1) {
            const info = radar.getById(this.trackedId);
            info?.restoreStyle();
        }

        this.trackedId = plane.id;
        this.lastAutoRes = this.enableMapScaling ? 0 : NaN;
        plane.blip.setSelectedStyle();

        const lastStep = plane.animator.lastStep;
        if (lastStep) {
            this.moveMapWithPlane(lastStep);
        }
    }

    public unfollowPlane() {
        if (this.trackedId == -1) {
            return;
        }
        const info = radar.getById(this.trackedId);
        this.trackedId = -1;

        info?.restoreStyle();
    }

    private adjustUpdateRate(resolution?: number) {
        if (resolution === undefined) {
            resolution = map.map.getView().getResolution();
        }
        
        if (resolution === undefined || resolution > 7) {
            this.minimumDeltaTime = 100;
        } else {
            this.minimumDeltaTime = 0;
        }
    }

    public get enableMapScaling() {
        return this.mapScalingEnabled;
    }

    public set enableMapScaling(value: boolean) {
        this.mapScalingEnabled = value;
        options.set('radar_follow_scale_map', value);
        if (!value) {
            this.lastAutoRes = NaN;
        } else if (this.trackedId != -1) {
            this.lastAutoRes = 0;
        }
    }

    public get enableInterpolation() {
        return this.interpolationEnabled;
    }

    public set enableInterpolation(value: boolean) {
        this.interpolationEnabled = value;
        options.set('radar_interpolate', value);
    }

    public createAnimator(params: MotionState) {
        return {
            first: params,
            second: params,
            start: null,
            stepLog: [ params ],
            lastStep: params,
        };
    }
}

function MathClamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function MathLerp(first: number, second: number, fraction: number): number {
    return (second - first) * fraction + first;
}

function lerpHeading(first: number, second: number, fraction: number) {
    let heading;
    let deltaHeading = second - first;
    if (deltaHeading > 180) {
        deltaHeading = deltaHeading - 360;
    } else if (deltaHeading < -180) {
        deltaHeading = 360 + deltaHeading;
    }
    
    heading = first + deltaHeading * fraction;
    if (heading >= 360) {
        heading = heading - 360;
    } else if (heading < 0) {
        heading = heading + 360;
    }
    return Math.round(heading * 1000) / 1000;
}

function lerpMotion(first: MotionState, second: MotionState, fraction: number): MotionState {
    return {
        longitude: MathLerp(first.longitude, second.longitude, fraction),
        latitude: MathLerp(first.latitude, second.latitude, fraction),
        heading: lerpHeading(first.heading, second.heading, fraction),
        altitude: MathLerp(first.altitude, second.altitude, fraction),
        groundSpeed: MathLerp(first.groundSpeed, second.groundSpeed, fraction),
        groundAltitude: MathLerp(first.groundAltitude, second.groundAltitude, fraction),
    };
}

export default RadarAnimator;
