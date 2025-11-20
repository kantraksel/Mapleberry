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
    private simcomEnabled: boolean;

    public readonly statusEvent: Event<StatusEvent>;
    public readonly resyncEvent: Event<ResyncEvent>;

    public constructor() {
        this.status = { simStatus: SimulatorStatus.Disconnected, simName: '' };
        this.ready = false;
        this.statusEvent = new Event();
        this.resyncEvent = new Event();

        this.simcomEnabled = options.get<boolean>('simcom_reconnect', true);

        hostBridge.onOpen = () => {
            this.initializeHost();
            this.statusEvent.invoke(this.status);
        };

        hostBridge.onClose = () => {
            this.status = { simStatus: SimulatorStatus.Disconnected, simName: '' };
            this.statusEvent.invoke(this.status);
        };

        hostBridge.onEnable = () => {
            this.statusEvent.invoke(this.status);
        };

        hostBridge.onDisable = () => {
            this.status = { simStatus: SimulatorStatus.Disconnected, simName: '' };
            this.statusEvent.invoke(this.status);
        };

        hostBridge.registerHandler(MsgId.ModifySystemState, data => {
            if (data.length === 0) {
                return;
            }
            const args = data[0] as ModifyStateMsg;
            this.modifySystemState(args);
        });

        hostBridge.registerHandler(MsgId.SendAllData, data => {
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

        hostBridge.send(MsgId.SendAllData);
        if (this.enableSimCom) {
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

    private sendStatusCmd(cmd: StatusCmd) {
        const obj: { '0'?: boolean } = {};
        switch (cmd)
        {
            case StatusCmd.ConnectSim: {
                obj[0] = true;
                break;
            }
                
            case StatusCmd.DisconnectSim: {
                obj[0] = false;
                break;
            }
        }

        hostBridge.send(MsgId.ModifySystemState, obj);
    }

    public getHostStatus() {
        return this.status;
    }

    public set enableSimCom(value: boolean) {
        this.simcomEnabled = value;
        options.set('simcom_reconnect', value);

        if (value) {
            this.sendStatusCmd(StatusCmd.ConnectSim);
        } else {
            this.sendStatusCmd(StatusCmd.DisconnectSim);
        }
    }

    public get enableSimCom() {
        return this.simcomEnabled;
    }
}

export default HostState;
