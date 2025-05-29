import { SimulatorStatus } from "../Host/HostState";
import { PhysicParams, validatePhysicParams } from "./MapPlane";
import RadarPlane from "./RadarPlane";
import RadarAnimator from "./RadarAnimator";
import Event from "../Event";

interface EventArgs {
    id: number;
}

interface FlightAddEventArgs extends EventArgs {
    planeModel: string;
    callsign: string;
}
type FlightRemoveEventArgs = EventArgs;
type FlightUpdateEventArgs = EventArgs & PhysicParams;
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

        hostBridge.registerHandler('FLT_ADD', (data: object) => {
            const args = data as Partial<FlightAddEventArgs>;
            if (typeof args.id !== 'number' || !Number.isFinite(args.id) ||
                typeof args.callsign !== 'string' || typeof args.planeModel !== 'string')
                return;

            if (args.callsign.length > 16)
                args.callsign = args.callsign.substring(0, 16);
            if (args.planeModel.length > 16)
                args.planeModel = args.planeModel.substring(0, 16);

            this.add(args.id, args.planeModel, args.callsign);
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
                !validatePhysicParams(args))
                return;

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
        this.onPlaneRemove(info);
        this.planes.delete(info.id);

        if (this.planes.size == 0) {
            this.animator.stop();
        }
    }

    private removeAll() {
        this.planes.forEach((info) => {
            this.onPlaneRemove(info);
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

    public onPlaneAdd(plane: RadarPlane) {
        plane.inMap = true;
        planeLayers.addPlane(plane.plane);
        this.planeAdded.invoke(plane);
    }

    private onPlaneRemove(plane: RadarPlane) {
        if (plane.inMap) {
            plane.inMap = false;
            planeLayers.removePlane(plane.plane);
            this.planeRemoved.invoke(plane);
        }
    }

    public getById(id: number) {
        return this.planes.get(id);
    }
}

export default Radar;
