import Event from '../Event';
import { MsgId } from './MsgId';

export enum SimulatorStatus {
    Disconnected = 1,
    Connected,
}

export enum ServerStatus {
    Stopped = 1,
    Listening,
    Connected,
}

export interface HostStatus {
    simStatus: SimulatorStatus;
    srvStatus: ServerStatus;
    simName?: string;
}

export enum StatusCmd {
    ConnectSim,
    DisconnectSim,
    StartServer,
    StopServer,
}

type StatusEvent = (status: HostStatus) => void;
type ResyncEvent = (obj: Record<string, unknown>) => void;
type ResyncEvent2 = (obj: Record<number, unknown>) => void;

class HostState {
    private status: HostStatus;
    private ready: boolean;

    public readonly statusEvent: Event<StatusEvent>;
    public readonly resyncEvent: Event<ResyncEvent>;
    public readonly resyncEvent2: Event<ResyncEvent2>;

    public constructor() {
        this.status = { simStatus: SimulatorStatus.Disconnected, srvStatus: ServerStatus.Stopped, simName: '' };
        this.ready = false;
        this.statusEvent = new Event();
        this.resyncEvent = new Event();
        this.resyncEvent2 = new Event();

        hostBridge.registerHandler('SRV_STATE', (data: object) => {
            const status = data as HostStatus;
            if (status.simStatus == null || status.srvStatus == null)
                return;
            if (typeof status.simStatus !== 'number' || typeof status.srvStatus !== 'number')
                return;

            let simName;
            if (status.simName != null && typeof status.simName === 'string')
                simName = status.simName;

            this.status = { simStatus: status.simStatus, srvStatus: status.srvStatus, simName: simName };
            this.statusEvent.invoke(this.status);
        });

        hostBridge.registerHandler('SRV_RESYNC', (data: object) => {
            this.resyncEvent.invoke(data as Record<string, unknown>);
        });

        hostBridge.onOpen = () => {
            if (this.ready) {
                hostBridge.send2(MsgId.SendAllData);
            }
        };

        hostBridge.registerHandler2(MsgId.ModifySystemState, data => {
            if (data.length === 0) {
                return;
            }
            const args = data[0] as { '0': number | [ number, string ], '1': number };
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

            if (typeof args[1] !== 'number') {
                return;
            }
            
            this.status = { simStatus, srvStatus: args[1], simName };
            this.statusEvent.invoke(this.status);
        });

        hostBridge.registerHandler2(MsgId.SendAllData, data => {
            if (data.length === 0) {
                return;
            }
            const args = data[0] as Record<number, unknown>;
            if (typeof args !== 'object' || !args) {
                return;
            }
            this.resyncEvent2.invoke(args);
        });

        if (this.launchServerOnStart) {
            this.sendStatusCmd(StatusCmd.StartServer);
        }
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
        hostBridge.send('SRV_RESYNC', {});

        if (hostBridge.open) {
            hostBridge.send2(MsgId.SendAllData);
        }
    }

    public resetApp() {
        this.status = { simStatus: SimulatorStatus.Disconnected, srvStatus: ServerStatus.Stopped, simName: '' };
        this.statusEvent.invoke(this.status);
        hostBridge.send('SRV_RESYNC', {});
        hostBridge.send2(MsgId.SendAllData);
    }

    public sendStatusCmd(cmd: StatusCmd) {
        const obj: { simConnection?: boolean, serverOpen?: boolean } = {};
        const obj2: { '0'?: boolean, '1'?: boolean } = {};
        switch (cmd)
        {
            case StatusCmd.ConnectSim: {
                obj.simConnection = true;
                obj2[0] = true;
                break;
            }
                
            case StatusCmd.DisconnectSim: {
                obj.simConnection = false;
                obj2[0] = false;
                break;
            }

            case StatusCmd.StartServer: {
                obj.serverOpen = true;
                obj2[1] = true;
                break;
            }

            case StatusCmd.StopServer: {
                obj.serverOpen = false;
                obj2[1] = false;
                break;
            }
        }

        hostBridge.send('SRV_MODIFY', obj);
        hostBridge.send2(MsgId.ModifySystemState, obj2);
    }

    public getHostStatus() {
        const status = this.status;
        return {
            simStatus: status.simStatus,
            srvStatus: status.srvStatus,
        };
    }

    public setAllowSimComReconnect(value: boolean) {
        options.set('simcom_reconnect', value);
        hostBridge.send('SRV_PROPS', { reconnectToSim: value });
        hostBridge.send2(MsgId.ModifySystemProperties, { '0': value });
    }

    public getAllowSimComReconnect() {
        return options.get<boolean>('simcom_reconnect', true);
    }

    public getSimName() {
        return this.status.simName;
    }

    public get launchServerOnStart() {
        return options.get<boolean>('server_autostart', false);
    }

    public set launchServerOnStart(value: boolean) {
        options.set('server_autostart', value);
    }
}

export default HostState;
