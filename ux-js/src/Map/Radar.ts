import { SimulatorStatus } from "../Host/HostState";
import { PhysicParams } from "./MapPlane";
import RadarPlane from "./RadarPlane";
import RadarAnimator from "./RadarAnimator";

interface EventArgs {
    id: number;
}

interface FlightAddEventArgs extends EventArgs {
    model: string;
    callsign: string;
}
type FlightRemoveEventArgs = EventArgs;
type FlightUpdateEventArgs = EventArgs & PhysicParams;

function MathClamp(value: number, min: number, max: number) : number {
    return Math.min(max, Math.max(min, value));
}

class Radar {
    private planes: Map<number, RadarPlane>;
    private animator: RadarAnimator;

    public constructor() {
        this.planes = new Map();
        this.animator = new RadarAnimator();

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

        hostState.statusEvent.add((status) => {
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
            info = new RadarPlane(id, model, callsign);
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

    public removePlane(info: RadarPlane) {
        info.deleteFromMap();
        this.planes.delete(info.id);

        if (this.planes.size == 0) {
            this.animator.stop();
        }
    }

    private removeAll() {
        this.planes.forEach((info) => {
            info.deleteFromMap();
        });
        this.planes.clear();
        this.animator.stop();
    }

    public update(data: FlightUpdateEventArgs) {
        const info = this.planes.get(data.id);
        if (!info) {
            return;
        }
        this.updatePlane(info, data);
    }

    public updatePlane(info: RadarPlane, data: FlightUpdateEventArgs) {
        info.update(data);
        this.animator.start();
    }

    public followPlane(plane: RadarPlane) {
        this.animator.followPlane(plane.id);
    }

    public forEach(callback: (plane: RadarPlane) => void) {
        this.planes.forEach((value) => {
            callback(value);
        });
    }
}

export default Radar;
