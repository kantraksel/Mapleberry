import MotionState, { validateMotionState } from "../../Map/MotionState";
import { SimulatorStatus } from "../../HostApp/HostState";
import RadarPlane from "../RadarPlane";
import { MsgId } from "../../HostApp/MsgId";

class LocalPlaneInfo {
    info: RadarPlane | null;

    public constructor() {
        this.info = null;
    }

    public reset() {
        this.info = null;
    }
}

interface UserAddEventArgs extends UserUpdateEventArgs {
    callsign: string;
    model: string;
}

interface UserUpdateEventArgs extends MotionState {
}

class UserTracker {
    private user: LocalPlaneInfo;
    private customCallsign_: string;

    public constructor() {
        this.user = new LocalPlaneInfo();

        this.customCallsign_ = options.get<string>('user_custom_callsign', '');

        hostBridge.registerHandler(MsgId.LocalAddAircraft, data => {
            this.handleAdd(data);
        });

        hostBridge.registerHandler(MsgId.LocalRemoveAircraft, _ => {
            this.removeUser();
        });

        hostBridge.registerHandler(MsgId.LocalUpdateAircraft, data => {
            this.handleUpdate(data);
        });

        hostState.resyncEvent.add(obj => {
            const data = obj[1];
            if (typeof data !== 'object' || !data) {
                return;
            }
            this.handleAdd([ data ]);
        });

        hostState.statusEvent.add((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                this.removeUser();
            }
        });
    }

    private handleAdd(data: unknown[]) {
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
            groundSpeed: args[6],
            model: args[10],
            callsign: args[11],
        };
        if (typeof obj.callsign !== 'string' || typeof obj.model !== 'string' ||
            !validateMotionState(obj)
        )
            return;

        if (obj.callsign.length > 16)
            obj.callsign = obj.callsign.substring(0, 16);
        if (obj.model.length > 16)
            obj.model = obj.model.substring(0, 16);
            
        this.addUser(obj);
    }

    private handleUpdate(data: unknown[]) {
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
            groundSpeed: args[6],
        };
        this.applyUpdate(obj);
    }

    private applyUpdate(obj: UserUpdateEventArgs) {
        if (!validateMotionState(obj))
            return;

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

        if (!info.inMap) {
            radar.followPlane(info);
        }

        data.id = 0;
        radar.update(info.id, data as Required<typeof data>);
    }

    public set customCallsign(name: string) {
        this.customCallsign_ = name;
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
        return this.customCallsign_;
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
    '6': number,
}

export default UserTracker;
