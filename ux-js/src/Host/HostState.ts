import Event from '../Event';

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

class HostState {
    private status: HostStatus;
    private ready: boolean;

    public readonly statusEvent: Event<StatusEvent>;
    public readonly resyncEvent: Event<ResyncEvent>;

    public constructor() {
        this.status = { simStatus: SimulatorStatus.Disconnected, srvStatus: ServerStatus.Stopped, simName: '' };
        this.ready = false;
        this.statusEvent = new Event();
        this.resyncEvent = new Event();

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
    }

    public notifyAppReady() {
        if (this.ready) {
            return;
        }
        this.ready = true;
        hostBridge.send('SRV_RESYNC', {});
    }

    public resetApp() {
        this.status = { simStatus: SimulatorStatus.Disconnected, srvStatus: ServerStatus.Stopped, simName: '' };
        this.statusEvent.invoke(this.status);
        hostBridge.send('SRV_RESYNC', {});
    }

    public sendStatusCmd(cmd: StatusCmd) {
        const obj: { simConnection?: boolean, serverOpen?: boolean } = {};
        switch (cmd)
        {
            case StatusCmd.ConnectSim: {
                obj.simConnection = true;
                break;
            }
                
            case StatusCmd.DisconnectSim: {
                obj.simConnection = false;
                break;
            }

            case StatusCmd.StartServer: {
                obj.serverOpen = true;
                break;
            }

            case StatusCmd.StopServer: {
                obj.serverOpen = false;
                break;
            }
        }

        hostBridge.send('SRV_MODIFY', obj);
    }

    public getHostStatus() {
        const status = this.status;
        return {
            simStatus: status.simStatus,
            srvStatus: status.srvStatus,
        };
    }

    public getSimName() {
        return this.status.simName;
    }
}

export default HostState;
