import { SimulatorStatus } from "../HostState";
import { PlaneInfo } from "./PlaneRadar";

class LocalPlaneInfo {
    info: PlaneInfo | null;

    indicatedAltitude: number;
    indicatedSpeed: number;

    public constructor() {
        this.info = null;
        this.indicatedAltitude = 0;
        this.indicatedSpeed = 0;
    }

    public reset() {
        this.info = null;
        this.indicatedAltitude = 0;
        this.indicatedSpeed = 0;
    }
}

interface UserAddEventArgs {
    callsign: string;
    model: string;
}

interface UserUpdateEventArgs {
    longitude: number;
    latitude: number;
    heading: number;
    altitude: number;
    groundSpeed: number;
    indicatedAltitude: number;
    indicatedSpeed: number;
    groundAltitude: number;
    verticalSpeed: number;
}

export interface Identity {
    callsign: string;
    plane: string;
}
type IdentEvent = (data: Identity) => void;

function MathClamp(value: number, min: number, max: number) : number {
    return Math.min(max, Math.max(min, value));
}

class UserTracker {
    private user: LocalPlaneInfo;
    private identEvent: Set<IdentEvent>;

    public constructor() {
        this.user = new LocalPlaneInfo();
        this.identEvent = new Set();

        hostBridge.registerHandler('UAC_ADD', (data: object) => {
            const args = data as Partial<UserAddEventArgs>;
            if (typeof args.callsign !== 'string' || typeof args.model !== 'string')
                return;

            if (args.callsign.length > 16)
                args.callsign = args.callsign.substring(0, 16);
            if (args.model.length > 16)
                args.model = args.model.substring(0, 16);

            this.addUser(args as UserAddEventArgs);
        });

        hostBridge.registerHandler('UAC_REMOVE', () => {
            this.removeUser();
        });

        hostBridge.registerHandler('UAC_UPDATE', (data: object) => {
            const args = data as Partial<UserUpdateEventArgs>;
            if (typeof args.longitude !== 'number' || !Number.isFinite(args.longitude) ||
                typeof args.latitude !== 'number' || !Number.isFinite(args.latitude) ||
                typeof args.heading !== 'number' || !Number.isFinite(args.heading) ||
                typeof args.altitude !== 'number' || !Number.isFinite(args.altitude) ||
                typeof args.groundSpeed !== 'number' || !Number.isFinite(args.groundSpeed) ||
                typeof args.indicatedAltitude !== 'number' || !Number.isFinite(args.indicatedAltitude) ||
                typeof args.indicatedSpeed !== 'number' || !Number.isFinite(args.indicatedSpeed) ||
                typeof args.groundAltitude !== 'number' || !Number.isFinite(args.groundAltitude) ||
                typeof args.verticalSpeed !== 'number' || !Number.isFinite(args.verticalSpeed))
                return;

            args.longitude = MathClamp(args.longitude, -360, 360);
            args.latitude = MathClamp(args.latitude, -360, 360);
            args.heading = MathClamp(args.heading, 0, 360);
            args.altitude = MathClamp(args.altitude, -10000, 100000);
            args.groundSpeed = MathClamp(args.groundSpeed, 0, 1000);
            args.indicatedAltitude = MathClamp(args.indicatedAltitude, -10000, 100000);
            args.indicatedSpeed = MathClamp(args.indicatedSpeed, 0, 1000);
            args.groundAltitude = MathClamp(args.groundAltitude, 0, 100000);
            args.verticalSpeed = MathClamp(args.verticalSpeed, -100000, 100000);

            this.updateUser(args as UserUpdateEventArgs);
        });

        hostState.addStatusUpdateEvent((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                this.removeUser();
            }
        });
    }

    public addUser(data: UserAddEventArgs) {
        const user = this.user;
        if (user.info) {
            this.removeUser();
        }

        const info = radar.add(0, data.model, data.callsign);
        user.info = info;
        info.plane.setUserStyle(true);

        this.invokeIdentEvent();
    }

    private removeUser() {
        const user = this.user;
        if (!user.info) {
            return;
        }

        radar.removePlane(user.info);
        user.reset();
        this.invokeIdentEvent();
    }

    public updateUser(data: UserUpdateEventArgs & { id?: number }) {
        const user = this.user;
        const info = user.info;
        if (!info) {
            return;
        }

        user.indicatedAltitude = data.indicatedAltitude;
        user.indicatedSpeed = data.indicatedSpeed;
        
        if (!info.inMap) {
            radar.trackPlane(info);
        }

        data.id = 0;
        radar.updatePlane(info, data as Required<typeof data>);
    }

    public addIdentEvent(callback: IdentEvent) {
        this.identEvent.add(callback);
    }

    public removeIdentEvent(callback: IdentEvent) {
        this.identEvent.delete(callback);
    }

    public getIdentity(): Identity {
        const info = this.user.info;
        if (!info) {
            return { plane: '-_-_', callsign: '-_-_-_-' };
        }
        return { plane: info.model, callsign: info.callsign };
    }

    private invokeIdentEvent() {
        const ident = this.getIdentity();
        this.identEvent.forEach((value) => {
            value(ident);
        });
    }
}

export default UserTracker;
