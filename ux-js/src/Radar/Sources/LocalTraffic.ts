import { SimulatorStatus } from '../../Host/HostState';
import { MsgId } from '../../Host/MsgId';
import { PhysicParams, validatePhysicParams } from '../../Map/MapPlane';

class LocalTraffic {
    public constructor() {
        hostBridge.registerHandler2(MsgId.RadarAddAircraft, data => {
            this.handleAdd2(data);
        });

        hostBridge.registerHandler2(MsgId.RadarRemoveAircraft, data => {
            this.handleRemove2(data);
        });

        hostBridge.registerHandler2(MsgId.RadarUpdateAircraft, data => {
            this.handleUpdate2(data);
        });

        hostState.resyncEvent.add(obj => {
            const data = obj[0];
            if (!(data instanceof Array)) {
                return;
            }

            data.forEach(obj => {
                this.handleAdd2([ obj ]);
            });
        });

        hostState.statusEvent.add((status) => {
            if (status.simStatus == SimulatorStatus.Disconnected) {
                radar.removeAll();
            }
        });
    }

    private handleAdd2(data: unknown[]) {
        if (data.length === 0) {
            return;
        }
        const args = data[0] as FlightAddEventArgs2;
        if (typeof args !== 'object' || !args) {
            return;
        }

        const obj = {
            id: args[0],
            longitude: args[1],
            latitude: args[2],
            heading: args[3],
            altitude: args[4],
            groundAltitude: args[5],
            indicatedSpeed: args[6],
            groundSpeed: args[7],
            verticalSpeed: args[8],
            model: args[9],
            callsign: args[10],
        };
        if (typeof obj.id !== 'number' || !Number.isFinite(obj.id) ||
            typeof obj.callsign !== 'string' || typeof obj.model !== 'string' ||
            !validatePhysicParams(obj))
            return;

        if (obj.callsign.length > 16)
            obj.callsign = obj.callsign.substring(0, 16);
        if (obj.model.length > 16)
            obj.model = obj.model.substring(0, 16);

        radar.add(obj.id, obj);
    }

    private handleRemove2(data: unknown[]) {
        if (data.length === 0) {
            return;
        }
        const args = data[0] as FlightRemoveEventArgs2;
        if (typeof args !== 'object' || !args) {
            return;
        }

        const obj = {
            id: args[0],
        };
        if (typeof obj.id !== 'number' || !Number.isFinite(obj.id))
            return;

        radar.remove(obj.id);
    }

    private handleUpdate2(data: unknown[]) {
        if (data.length === 0) {
            return;
        }
        const args = data[0] as FlightUpdateEventArgs2;
        if (typeof args !== 'object' || !args) {
            return;
        }

        const obj = {
            id: args[0],
            longitude: args[1],
            latitude: args[2],
            heading: args[3],
            altitude: args[4],
            groundAltitude: args[5],
            indicatedSpeed: args[6],
            groundSpeed: args[7],
            verticalSpeed: args[8],
        };
        if (typeof obj.id !== 'number' || !Number.isFinite(obj.id) ||
            !validatePhysicParams(obj))
            return;

        radar.update(obj.id, obj as PhysicParams);
    }
}

interface FlightAddEventArgs2 extends FlightUpdateEventArgs2 {
    '9': string,
    '10': string,
}

interface FlightUpdateEventArgs2 {
    '0': number,
    '1': number,
    '2': number,
    '3': number,
    '4': number,
    '5': number,
    '6': number,
    '7': number,
    '8': number,
}

interface FlightRemoveEventArgs2 {
    '0': number,
}

export default LocalTraffic;
