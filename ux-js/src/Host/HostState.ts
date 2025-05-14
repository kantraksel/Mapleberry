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

class HostState {
    private status: HostStatus;

    public readonly statusEvent: Event<StatusEvent>;

    public constructor() {
        this.status = { simStatus: SimulatorStatus.Disconnected, srvStatus: ServerStatus.Stopped, simName: '' };
        this.statusEvent = new Event();

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
    }

    public notifyAppReady() {
        hostBridge.send('ALL_RQST_STATE', {});
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
