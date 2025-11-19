import { SimulatorStatus } from "../../../Backend/HostApp/HostState";
import RadarPlane from "../../../Backend/LocalRadar/RadarPlane";
import { compareIgnoreCase } from "../Shared";
import DynamicBoard, { Column } from "./Elements/DynamicBoard";
import OpenButton from "./OpenButton";

const planeColumns: Column<RadarPlane>[] = [
    {
        width: 135,
        id: 'callsign',
        label: 'Callsign',
        data: data => data.callsign,
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 100,
        id: 'type',
        label: 'Type',
        data: data => {
            return data.model;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.model, b.model);
        },
        alignData: 'center',
    },
    {
        width: 219,
        id: 'name',
        label: 'Name',
        data: data => data.blip.netState?.pilot.name ?? '- Network feed not available -',
        compare: (a, b) => {
            const one = a.blip.netState;
            const two = b.blip.netState;

            if (!one) {
                if (two) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (!two) {
                return 1;
            }
            return compareIgnoreCase(one.pilot.name, two.pilot.name);
        },
    },
    {
        width: 60,
        id: 'buttons',
        label: '',
        data: data => {
            const disabled = data.blip.netState == null;
            const onClick = () => {
                const pilot = data.blip.netState!;
                cards.showPilotCard(pilot);
            };
            return <OpenButton onClick={onClick} disabled={disabled} />;
        },
    },
];

export default function LocalPlaneBoard(props: { enabled: boolean }) {
    const data = () => radar.getPlaneList();
    const label = hostState.getHostStatus().simStatus == SimulatorStatus.Connected ? undefined : 'Simulator is offline';
    return <DynamicBoard enabled={props.enabled} columns={planeColumns} values={data} replaceLabel={label} />;
}
