import { PhysicParams, validatePhysicParams } from "../../Map/MapPlane";
import { SimulatorStatus } from "../../Host/HostState";
import RadarPlane from "../RadarPlane";
import Event from "../../Event";

class LocalPlaneInfo {
    info: RadarPlane | null;

    realAltitude: number;
    realHeading: number;

    public constructor() {
        this.info = null;
        this.realAltitude = 0;
        this.realHeading = 0;
    }

    public reset() {
        this.info = null;
        this.realAltitude = 0;
        this.realHeading = 0;
    }
}

interface UserAddEventArgs {
    callsign: string;
    planeModel: string;
}

interface UserUpdateEventArgs extends PhysicParams {
    realAltitude: number;
    realHeading: number;
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
            if (typeof args.callsign !== 'string' || typeof args.planeModel !== 'string')
                return;

            if (args.callsign.length > 16)
                args.callsign = args.callsign.substring(0, 16);
            if (args.planeModel.length > 16)
                args.planeModel = args.planeModel.substring(0, 16);

            this.addUser(args as UserAddEventArgs);
        });

        hostBridge.registerHandler('UAC_REMOVE', () => {
            this.removeUser();
        });

        hostBridge.registerHandler('UAC_UPDATE', (data: object) => {
            const args = data as Partial<UserUpdateEventArgs>;
            if (!validatePhysicParams(args) ||
                typeof args.realAltitude !== 'number' || !Number.isFinite(args.realAltitude) ||
                typeof args.realHeading !== 'number' || !Number.isFinite(args.realHeading))
                return;

            args.realAltitude = MathClamp(args.realAltitude, -10000, 100000);
            args.realHeading = MathClamp(args.realHeading, 0, 360);

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

        const info = radar.add(0, data.planeModel, data.callsign);
        user.info = info;
        info.tagMain();

        const customCallsign = this.customCallsign;
        if (customCallsign.length != 0) {
            info.plane.setCallsign(customCallsign);
        }

        this.identEvent.invoke(this.getIdentity());
    }

    private removeUser() {
        const user = this.user;
        if (!user.info) {
            return;
        }

        radar.remove(user.info.id);
        user.reset();
        this.identEvent.invoke(this.getIdentity());
    }

    private updateUser(data: UserUpdateEventArgs & { id?: number }) {
        const user = this.user;
        const info = user.info;
        if (!info) {
            return;
        }

        user.realAltitude = data.realAltitude;
        
        if (!info.inMap) {
            radar.followPlane(info);
        }

        data.id = 0;
        radar.update(info.id, data as Required<typeof data>);
    }

    public getIdentity(): Identity {
        const info = this.user.info;
        if (!info) {
            return { plane: '0000', callsign: 'UFO0000' };
        }

        let callsign = this.customCallsign;
        if (callsign.length == 0) {
            callsign = info.callsign;
        }
        return { plane: info.model, callsign };
    }

    public set customCallsign(name: string) {
        options.set('user_custom_callsign', name);

        const info = this.user.info;
        if (!info) {
            return;
        }
        if (name.length == 0) {
            name = info.callsign;
        }
        info.plane.setCallsign(name);
        this.identEvent.invoke(this.getIdentity());
    }

    public get customCallsign() {
        return options.get<string>('user_custom_callsign', '');
    }
}

export default UserTracker;
