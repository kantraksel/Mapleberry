import { PhysicParams, validatePhysicParams } from "../../Map/MapPlane";
import { SimulatorStatus } from "../../Host/HostState";
import RadarPlane from "../RadarPlane";
import { MsgId } from "../../Host/MsgId";

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

interface UserAddEventArgs extends UserUpdateEventArgs {
    callsign: string;
    model: string;
}

interface UserUpdateEventArgs extends PhysicParams {
    realAltitude: number;
    realHeading: number;
}

function MathClamp(value: number, min: number, max: number) : number {
    return Math.min(max, Math.max(min, value));
}

class UserTracker {
    private user: LocalPlaneInfo;

    public constructor() {
        this.user = new LocalPlaneInfo();

        hostBridge.registerHandler2(MsgId.LocalAddAircraft, data => {
            this.handleAdd2(data);
        });

        hostBridge.registerHandler2(MsgId.LocalRemoveAircraft, _ => {
            this.removeUser();
        });

        hostBridge.registerHandler2(MsgId.LocalUpdateAircraft, data => {
            this.handleUpdate2(data);
        });

        hostState.resyncEvent.add(obj => {
            const data = obj[1];
            if (typeof data !== 'object' || !data) {
                return;
            }
            this.handleAdd2([ data ]);
        });

        hostState.statusEvent.add((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                this.removeUser();
            }
        });
    }

    private handleAdd2(data: unknown[]) {
        if (data.length === 0) {
            return;
        }
        const args = data[0] as UserAddEventArgs2;
        if (typeof args !== 'object' || !args) {
            return;
        }

        const obj: UserAddEventArgs = {
            longitude: args[0],
            latitude: args[1],
            heading: args[2],
            altitude: args[3],
            groundAltitude: args[4],
            indicatedSpeed: args[5],
            groundSpeed: args[6],
            verticalSpeed: args[7],
            realAltitude: args[8],
            realHeading: args[9],
            model: args[10],
            callsign: args[11],
        };
        if (typeof obj.callsign !== 'string' || typeof obj.model !== 'string' ||
            !validatePhysicParams(obj) ||
            typeof obj.realAltitude !== 'number' || !Number.isFinite(obj.realAltitude) ||
            typeof obj.realHeading !== 'number' || !Number.isFinite(obj.realHeading)
        )
            return;

        if (obj.callsign.length > 16)
            obj.callsign = obj.callsign.substring(0, 16);
        if (obj.model.length > 16)
            obj.model = obj.model.substring(0, 16);
        obj.realAltitude = MathClamp(obj.realAltitude, -10000, 100000);
        obj.realHeading = MathClamp(obj.realHeading, 0, 360);
            
        this.addUser(obj);
    }

    private handleUpdate2(data: unknown[]) {
        if (data.length === 0) {
            return;
        }
        const args = data[0] as UserUpdateEventArgs2;
        if (typeof args !== 'object' || !args) {
            return;
        }

        const obj: UserUpdateEventArgs = {
            longitude: args[0],
            latitude: args[1],
            heading: args[2],
            altitude: args[3],
            groundAltitude: args[4],
            indicatedSpeed: args[5],
            groundSpeed: args[6],
            verticalSpeed: args[7],
            realAltitude: args[8],
            realHeading: args[9],
        };
        this.applyUpdate(obj);
    }

    private applyUpdate(obj: UserUpdateEventArgs) {
        if (!validatePhysicParams(obj) ||
            typeof obj.realAltitude !== 'number' || !Number.isFinite(obj.realAltitude) ||
            typeof obj.realHeading !== 'number' || !Number.isFinite(obj.realHeading))
            return;

        obj.realAltitude = MathClamp(obj.realAltitude, -10000, 100000);
        obj.realHeading = MathClamp(obj.realHeading, 0, 360);

        this.updateUser(obj);
    }

    private addUser(data: UserAddEventArgs) {
        const user = this.user;
        if (user.info) {
            this.removeUser();
        }

        const info = radar.add(0, data);
        user.info = info;
        info.tagMain();

        const customCallsign = this.customCallsign;
        if (customCallsign.length != 0) {
            info.blip.callsign = customCallsign;
        }
    }

    private removeUser() {
        const user = this.user;
        if (!user.info) {
            return;
        }

        radar.remove(user.info.id);
        user.reset();
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

    public set customCallsign(name: string) {
        options.set('user_custom_callsign', name);

        const info = this.user.info;
        if (!info) {
            return;
        }
        if (name.length == 0) {
            name = info.callsign;
        }
        info.blip.callsign = name;
    }

    public get customCallsign() {
        return options.get<string>('user_custom_callsign', '');
    }

    public getUser() {
        return this.user.info;
    }
}

interface UserAddEventArgs2 extends UserUpdateEventArgs2 {
    '10': string,
    '11': string,
}

interface UserUpdateEventArgs2 {
    '0': number,
    '1': number,
    '2': number,
    '3': number,
    '4': number,
    '5': number,
    '6': number,
    '7': number,
    '8': number,
    '9': number,
}

export default UserTracker;
