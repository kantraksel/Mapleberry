import { SimulatorStatus } from "../Host/HostState";
import MapPlane from "./MapPlane";

interface FlightAddEventArgs {
    id: number;
    model: string;
    callsign: string;
}

interface FlightRemoveEventArgs {
    id: number;
}

interface PhysicParams {
    longitude: number;
    latitude: number;
    heading: number;
    altitude: number;
    groundSpeed: number;
    groundAltitude: number;
    indicatedSpeed: number;
    verticalSpeed: number;
}

interface FlightUpdateEventArgs extends PhysicParams {
    id: number;
}

function MathClamp(value: number, min: number, max: number) : number {
    return Math.min(max, Math.max(min, value));
}

function MathLerp(first: number, second: number, fraction: number) : number {
    return (second - first) * fraction + first;
}

class PlaneParams implements PhysicParams {
    longitude: number;
    latitude: number;
    heading: number;
    altitude: number;
    groundSpeed: number;
    groundAltitude: number;
    indicatedSpeed: number;
    verticalSpeed: number;

    constructor() {
        this.longitude = 0;
        this.latitude = 0;
        this.heading = 0;
        this.altitude = 0;
        this.groundSpeed = 0;
        this.groundAltitude = 0;
        this.indicatedSpeed = 0;
        this.verticalSpeed = 0;
    }

    copy(other: PhysicParams) {
        this.longitude = other.longitude;
        this.latitude = other.latitude;
        this.heading = other.heading;
        this.altitude = other.altitude;
        this.groundSpeed = other.groundSpeed;
        this.groundAltitude = other.groundAltitude;
        this.indicatedSpeed = other.indicatedSpeed;
        this.verticalSpeed = other.verticalSpeed;
    }

    lerp(first: PhysicParams, second: PhysicParams, fraction: number) {
        this.longitude = MathLerp(first.longitude, second.longitude, fraction);
        this.latitude = MathLerp(first.latitude, second.latitude, fraction);
        this.heading = MathLerp(first.heading, second.heading, fraction);
        this.altitude = MathLerp(first.altitude, second.altitude, fraction);
        this.groundSpeed = MathLerp(first.groundSpeed, second.groundSpeed, fraction);
        this.groundAltitude = MathLerp(first.groundAltitude, second.groundAltitude, fraction);
        this.indicatedSpeed = MathLerp(first.indicatedSpeed, second.indicatedSpeed, fraction);
        this.verticalSpeed = MathLerp(first.verticalSpeed, second.verticalSpeed, fraction);
    }
}

interface AnimatorState {
    first: PlaneParams | null;
    second: PlaneParams | null;
    start: number;

    stepLog: PlaneParams[];
}

export class PlaneInfo {
    id: number;
    model: string;
    callsign: string;

    params?: PlaneParams;
    animator: AnimatorState;

    inMap: boolean;
    plane: MapPlane;

    public constructor(id: number, model: string, callsign: string) {
        this.id = id;
        this.model = model;
        this.callsign = callsign;

        this.animator = {
            first: null,
            second: null,
            start: 0,
            stepLog: [],
        };

        this.inMap = false;
        this.plane = new MapPlane();
        this.plane.userObject = this;
        this.plane.setCallsign(callsign);
    }

    public setIdent(model: string, callsign: string) {
        this.model = model;
        this.callsign = callsign;
        this.plane.setCallsign(callsign);
    }

    public updatePos(data: FlightUpdateEventArgs) {
        const params = new PlaneParams();
        params.copy(data);
        this.animator.stepLog.push(params);
    }

    updateRealtimeData(params: PlaneParams) {
        this.params = params;
        this.plane.setPosition(params);

        if (!this.inMap) {
            this.inMap = true;
            map.addPlane(this.plane);
        }
    }

    public removePos() {
        if (this.inMap) {
            map.removePlane(this.plane);
        }
    }
}

class PlaneRadar {
    private planes: Map<number, PlaneInfo>;
    private trackedId: number;
    private lastAutoRes: number;
    private animatorId?: number;

    public constructor() {
        this.planes = new Map();
        this.trackedId = -1;
        this.lastAutoRes = NaN;

        hostBridge.registerHandler('FLT_ADD', (data: object) => {
            const args = data as Partial<FlightAddEventArgs>;
            if (typeof args.id !== 'number' || !Number.isFinite(args.id) ||
                typeof args.callsign !== 'string' || typeof args.model !== 'string')
                return;

            if (args.callsign.length > 16)
                args.callsign = args.callsign.substring(0, 16);
            if (args.model.length > 16)
                args.model = args.model.substring(0, 16);

            this.add(args.id, args.model, args.callsign);
        });

        hostBridge.registerHandler('FLT_REMOVE', (data: object) => {
            const args = data as Partial<FlightRemoveEventArgs>;
            if (typeof args.id !== 'number' || !Number.isFinite(args.id))
                return;

            this.remove(args.id);
        });

        hostBridge.registerHandler('FLT_UPDATE', (data: object) => {
            const args = data as Partial<FlightUpdateEventArgs>;
            if (typeof args.id !== 'number' || !Number.isFinite(args.id) ||
                typeof args.longitude !== 'number' || !Number.isFinite(args.longitude) ||
                typeof args.latitude !== 'number' || !Number.isFinite(args.latitude) ||
                typeof args.heading !== 'number' || !Number.isFinite(args.heading) ||
                typeof args.altitude !== 'number' || !Number.isFinite(args.altitude) ||
                typeof args.groundSpeed !== 'number' || !Number.isFinite(args.groundSpeed) ||
                typeof args.groundAltitude !== 'number' || !Number.isFinite(args.groundAltitude) ||
                typeof args.indicatedSpeed !== 'number' || !Number.isFinite(args.indicatedSpeed) ||
                typeof args.verticalSpeed !== 'number' || !Number.isFinite(args.verticalSpeed))
                return;

            args.longitude = MathClamp(args.longitude, -360, 360);
            args.latitude = MathClamp(args.latitude, -360, 360);
            args.heading = MathClamp(args.heading, 0, 360);
            args.altitude = MathClamp(args.altitude, -10000, 100000);
            args.groundSpeed = MathClamp(args.groundSpeed, 0, 1000);
            args.groundAltitude = MathClamp(args.altitude, 0, 100000);
            args.indicatedSpeed = MathClamp(args.indicatedSpeed, 0, 1000);
            args.verticalSpeed = MathClamp(args.verticalSpeed, -100000, 100000);

            this.update(args as FlightUpdateEventArgs);
        });

        map.addClickEvent((e) => {
            const obj = e.get('user_object');
            if (!obj || !(obj instanceof PlaneInfo)) {
                return;
            }

            const info = obj as PlaneInfo;
            this.trackPlane(info);
        });

        map.addMoveStartEvent(() => {
            this.trackedId = -1;
        });

        map.addChangeResEvent((value) => {
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

        hostState.addStatusUpdateEvent((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                this.removeAll();
            }
        });
    }

    public add(id: number, model: string, callsign: string) {
        let info = this.planes.get(id);
        if (info) {
            info.setIdent(model, callsign);
        } else {
            info = new PlaneInfo(id, model, callsign);
            this.planes.set(id, info);
        }
        return info;
    }

    public remove(id: number) {
        const info = this.planes.get(id);
        if (!info) {
            return;
        }
        this.removePlane(info);
    }

    public removePlane(info: PlaneInfo) {
        info.removePos();
        this.planes.delete(info.id);

        if (this.planes.size == 0 && this.animatorId !== undefined) {
            cancelAnimationFrame(this.animatorId);
            delete this.animatorId;
        }
    }

    private removeAll() {
        this.planes.forEach((info) => {
            this.removePlane(info);
        });
        this.planes.clear();

        if (this.animatorId !== undefined) {
            cancelAnimationFrame(this.animatorId);
            delete this.animatorId;
        }
    }

    public update(data: FlightUpdateEventArgs) {
        const info = this.planes.get(data.id);
        if (!info) {
            return;
        }
        this.updatePlane(info, data);
    }

    public updatePlane(info: PlaneInfo, data: FlightUpdateEventArgs) {
        info.updatePos(data);
        /*
        if (info.id == this.trackedId) {
            this.moveMapWithPlane(info);
        }
        */
        if (this.animatorId === undefined) {
            this.animateMap();
        }
    }

    public trackPlane(info: PlaneInfo) {
        if (this.trackedId == info.id) {
            return;
        }

        this.trackedId = info.id;
        this.lastAutoRes = 0;
        /*
        if (info.inMap) {
            this.moveMapWithPlane(info);
        }
        */
    }

    private moveMapWithPlane(info: PlaneParams) {
        /*
        if (speed < 50) {
            resolution = 7;
        } else if (speed < 250) {
            resolution = (speed - 50) / (250 - 50);
            resolution = resolution * 93 + 7;
        } else {
            resolution = Math.min(speed - 250, 50) / 50;
            resolution = resolution * 270 + 100;
        }
        */

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

    private animateMap() {
        let activeEntities = 0;
        const fn = (timestamp: number) => {
            this.planes.forEach((info) => {
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
                const params = new PlaneParams();
                params.lerp(first, second, n);
                info.updateRealtimeData(params);

                if (info.id == this.trackedId) {
                    this.moveMapWithPlane(params);
                }

                if (time >= 1000) {
                    data.first = null;
                    data.second = null;
                } else {
                    activeEntities++;
                }
            });

            if (activeEntities > 0) {
                this.animatorId = requestAnimationFrame(fn);
            } else {
                delete this.animatorId;
            }
        };
        this.animatorId = requestAnimationFrame(fn);
    }
}

export default PlaneRadar;
