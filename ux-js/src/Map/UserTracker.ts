import { PhysicParams } from "./MapPlane";
import { SimulatorStatus } from "../Host/HostState";
import RadarPlane from "./RadarPlane";
import Event from "../Event";

class LocalPlaneInfo {
    info: RadarPlane | null;

    indicatedAltitude: number;

    public constructor() {
        this.info = null;
        this.indicatedAltitude = 0;
    }

    public reset() {
        this.info = null;
        this.indicatedAltitude = 0;
    }
}

interface UserAddEventArgs {
    callsign: string;
    model: string;
}

interface UserUpdateEventArgs extends PhysicParams {
    indicatedAltitude: number;
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
    public readonly identEvent: Event<IdentEvent>;

    public constructor() {
        this.user = new LocalPlaneInfo();
        this.identEvent = new Event();

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

        hostState.statusEvent.add((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                this.removeUser();
            }
        });
    }

    private addUser(data: UserAddEventArgs) {
        const user = this.user;
        if (user.info) {
            this.removeUser();
        }

        const info = radar.add(0, data.model, data.callsign);
        user.info = info;
        info.plane.setMainStyle();

        this.identEvent.invoke(this.getIdentity());
    }

    private removeUser() {
        const user = this.user;
        if (!user.info) {
            return;
        }

        radar.removePlane(user.info);
        user.reset();
        this.identEvent.invoke(this.getIdentity());
    }

    private updateUser(data: UserUpdateEventArgs & { id?: number }) {
        const user = this.user;
        const info = user.info;
        if (!info) {
            return;
        }

        user.indicatedAltitude = data.indicatedAltitude;
        
        if (!info.inMap) {
            radar.followPlane(info);
        }

        data.id = 0;
        radar.updatePlane(info, data as Required<typeof data>);
    }

    public getIdentity(): Identity {
        const info = this.user.info;
        if (!info) {
            return { plane: '0000', callsign: 'UFO0000' };
        }
        return { plane: info.model, callsign: info.callsign };
    }
}

export default UserTracker;
