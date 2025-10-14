import Event from '../Event';
import { MsgId } from './MsgId';

export enum SimulatorStatus {
    Disconnected = 1,
    Connected,
}

export interface HostStatus {
    simStatus: SimulatorStatus;
    simName?: string;
}

export enum StatusCmd {
    ConnectSim,
    DisconnectSim,
}

interface ModifyStateMsg {
    '0': number | [ number, string ],
    '1': number,
};

type StatusEvent = (status: HostStatus) => void;
type ResyncEvent = (obj: Record<number, unknown>) => void;

class HostState {
    private status: HostStatus;
    private ready: boolean;

    public readonly statusEvent: Event<StatusEvent>;
    public readonly resyncEvent: Event<ResyncEvent>;

    public constructor() {
        this.status = { simStatus: SimulatorStatus.Disconnected, simName: '' };
        this.ready = false;
        this.statusEvent = new Event();
        this.resyncEvent = new Event();

        hostBridge.onOpen = () => {
            this.initializeHost();
            this.status = this.getHostStatus();
            this.statusEvent.invoke(this.status);
        };

        hostBridge.onClose = () => {
            this.status = { simStatus: SimulatorStatus.Disconnected, simName: '' };
            this.statusEvent.invoke(this.status);
        };

        hostBridge.onEnable = () => {
            this.status = this.getHostStatus();
            this.statusEvent.invoke(this.status);
        };

        hostBridge.onDisable = () => {
            this.status = { simStatus: SimulatorStatus.Disconnected, simName: '' };
            this.statusEvent.invoke(this.status);
        };

        hostBridge.registerHandler2(MsgId.ModifySystemState, data => {
            if (data.length === 0) {
                return;
            }
            const args = data[0] as ModifyStateMsg;
            this.modifySystemState(args);
        });

        hostBridge.registerHandler2(MsgId.SendAllData, data => {
            if (data.length === 0) {
                return;
            }
            const args = data[0] as Record<number, unknown>;
            if (typeof args !== 'object' || !args) {
                return;
            }
            this.resyncEvent.invoke(args);
        });

        this.resyncEvent.add(obj => {
            const data = obj[2] as ModifyStateMsg;
            this.modifySystemState(data);
        });
    }

    private modifySystemState(args: ModifyStateMsg) {
        if (typeof args !== 'object' || !args) {
            return;
        }

        const sim = args[0];

        let simStatus, simName;
        if (sim instanceof Array) {
            simStatus = sim[0];
            if (typeof sim[1] === 'string') {
                simName = sim[1];
            }
        } else if (typeof sim === 'number') {
            simStatus = sim;
        } else {
            return;
        }
        
        this.status = { simStatus, simName };
        this.statusEvent.invoke(this.status);
    }

    private initializeHost() {
        if (!this.ready || !hostBridge.open) {
            return;
        }

        hostBridge.send2(MsgId.SendAllData);
        if (this.getAllowSimComReconnect()) {
            this.setAllowSimComReconnect(true);
            this.sendStatusCmd(StatusCmd.ConnectSim);
        }
    }

    public notifyAppReady() {
        if (this.ready) {
            return;
        }
        this.ready = true;
        this.initializeHost();
    }

    public sendStatusCmd(cmd: StatusCmd) {
        const obj2: { '0'?: boolean } = {};
        switch (cmd)
        {
            case StatusCmd.ConnectSim: {
                obj2[0] = true;
                break;
            }
                
            case StatusCmd.DisconnectSim: {
                obj2[0] = false;
                break;
            }
        }

        hostBridge.send2(MsgId.ModifySystemState, obj2);
    }

    public getHostStatus() {
        const status = this.status;
        return {
            simStatus: status.simStatus,
        };
    }

    public setAllowSimComReconnect(value: boolean) {
        options.set('simcom_reconnect', value);
        hostBridge.send2(MsgId.ModifySystemProperties, { '0': value });
    }

    public getAllowSimComReconnect() {
        return options.get<boolean>('simcom_reconnect', true);
    }

    public getSimName() {
        return this.status.simName;
    }
}

export default HostState;
