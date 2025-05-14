import MapPlane, { PhysicParams } from "./MapPlane";
import RadarPlane from "./RadarPlane";

class RadarAnimator {
    private animatorId: number | null;
    private trackedId: number;
    private lastAutoRes: number;

    public constructor() {
        this.animatorId = null;
        this.trackedId = -1;
        this.lastAutoRes = NaN;

        map.clickEvent.add((e) => {
            const obj = MapPlane.getUserObject(e);
            if (!obj || !(obj instanceof RadarPlane)) {
                return;
            }

            const info = obj as RadarPlane;
            this.followPlane(info.id);
        });

        map.moveStartEvent.add(() => {
            this.trackedId = -1;
        });

        map.changeResEvent.add((value) => {
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
    }

    public start() {
        if (this.animatorId !== null) {
            return;
        }

        const fn = (timestamp: number) => {
            let activeEntities = 0;

            radar.forEach((info) => {
                const data = info.animator;
                if (!data.first) {
                    const stepLog = data.stepLog;
                    if (stepLog.length < 2) {
                        return;
                    }

                    const i = stepLog.length - 2;
                    data.first = stepLog[i];
                    data.second = stepLog[i + 1];
                    data.start = timestamp;

                    data.stepLog = [ data.second ];
                }

                const time = timestamp - data.start;
                const first = data.first;
                const second = data.second!;

                const n = MathClamp(time / 1000, 0, 1);
                const params = lerpParams(first, second, n);
                info.updateAnimation(params);

                if (info.id == this.trackedId) {
                    this.moveMapWithPlane(params);
                }

                if (time >= 1000) {
                    data.first = null;
                    data.second = null;
                }
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

    private moveMapWithPlane(info: PhysicParams) {
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
        else if (speed < 20) {
            resolution = 5;
        } else if (speed < 50) {
            resolution = ((speed - 20) / 30) * 5 + 5; // 5-10
        } else if (altitude < 2000) {
            resolution = (altitude / 2000) * 10 + 10; // 10-20
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
        if (this.animatorId !== null) {
            cancelAnimationFrame(this.animatorId);
            this.animatorId = null;
        }
    }

    public followPlane(id: number) {
        if (this.trackedId === id) {
            return;
        }

        this.trackedId = id;
        this.lastAutoRes = 0;
    }
}

function MathClamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function MathLerp(first: number, second: number, fraction: number): number {
    return (second - first) * fraction + first;
}

function lerpParams(first: PhysicParams, second: PhysicParams, fraction: number): PhysicParams {
    return {
        longitude: MathLerp(first.longitude, second.longitude, fraction),
        latitude: MathLerp(first.latitude, second.latitude, fraction),
        heading: MathLerp(first.heading, second.heading, fraction),
        altitude: MathLerp(first.altitude, second.altitude, fraction),
        groundSpeed: MathLerp(first.groundSpeed, second.groundSpeed, fraction),
        groundAltitude: MathLerp(first.groundAltitude, second.groundAltitude, fraction),
        indicatedSpeed: MathLerp(first.indicatedSpeed, second.indicatedSpeed, fraction),
        verticalSpeed: MathLerp(first.verticalSpeed, second.verticalSpeed, fraction),
    };
}

export default RadarAnimator;
