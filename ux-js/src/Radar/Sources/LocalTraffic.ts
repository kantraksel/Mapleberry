import { SimulatorStatus } from '../../Host/HostState';
import { PhysicParams, validatePhysicParams } from '../../Map/MapPlane';

interface EventArgs {
    id: number;
}

interface FlightAddEventArgs extends EventArgs, PhysicParams {
    planeModel: string;
    callsign: string;
}
type FlightRemoveEventArgs = EventArgs;
type FlightUpdateEventArgs = EventArgs & PhysicParams;

class LocalTraffic {
    public constructor() {
        hostBridge.registerHandler('FLT_ADD', (data: object) => {
            this.handleAdd(data);
        });

        hostBridge.registerHandler('FLT_REMOVE', (data: object) => {
            const args = data as Partial<FlightRemoveEventArgs>;
            if (typeof args.id !== 'number' || !Number.isFinite(args.id))
                return;

            radar.remove(args.id);
        });

        hostBridge.registerHandler('FLT_UPDATE', (data: object) => {
            this.handleUpdate(data);
        });

        hostState.resyncEvent.add((obj) => {
            const data = obj.radar;
            if (typeof data !== 'object' || !data || !(data instanceof Array)) {
                return;
            }

            data.forEach((info) => {
                this.handleAdd(info);
            });
        });

        hostState.statusEvent.add((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                radar.removeAll();
            }
        });
    }

    private handleAdd(data: object) {
        const args = data as Partial<FlightAddEventArgs>;
        if (typeof args.id !== 'number' || !Number.isFinite(args.id) ||
            typeof args.callsign !== 'string' || typeof args.planeModel !== 'string')
            return;

        if (args.callsign.length > 16)
            args.callsign = args.callsign.substring(0, 16);
        if (args.planeModel.length > 16)
            args.planeModel = args.planeModel.substring(0, 16);

        radar.add(args.id, args.planeModel, args.callsign);
        this.handleUpdate(data);
    }

    private handleUpdate(data: object) {
        const args = data as Partial<FlightUpdateEventArgs>;
        if (typeof args.id !== 'number' || !Number.isFinite(args.id) ||
            !validatePhysicParams(args))
            return;

        radar.update(args.id, args as PhysicParams);
    }
}

export default LocalTraffic;
