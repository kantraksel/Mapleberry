import NetworkPilot from "../../../Backend/NetworkUplink/Source/Objects/NetworkPilot";
import { compareIgnoreCase } from "../Shared";
import { Column } from "./Elements/DynamicBoard";
import NetworkList from "./Elements/NetworkBoard";
import OpenButton from "./OpenButton";

const pilotColumns: Column<NetworkPilot>[] = [
    {
        width: 65,
        id: 'callsign',
        label: 'Callsign',
        data: data => data.pilot.callsign,
        compare: (a, b) => {
            return compareIgnoreCase(a.pilot.callsign, b.pilot.callsign);
        },
    },
    {
        width: 50,
        id: 'type',
        label: 'Type',
        data: (pilot) => {
            if (!pilot.pilot.flight_plan) {
                return '';
            }
            return pilot.pilot.flight_plan.aircraft_short;
        },
        compare: (a, b) => {
            const one = a.pilot.flight_plan;
            const two = b.pilot.flight_plan;

            if (!one) {
                if (two) {
                    return -1;
                } else {
                    return 0;
                }
            } else if (!two) {
                return 1;
            }
            return compareIgnoreCase(one.aircraft_short, two.aircraft_short);
        },
        alignData: 'center',
    },
    {
        width: 200,
        id: 'name',
        label: 'Name',
        data: data => data.pilot.name,
        compare: (a, b) => {
            return compareIgnoreCase(a.pilot.name, b.pilot.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: (data) => {
            const onClick = () => {
                cards.showPilotCard(data);
            };
            return <OpenButton onClick={onClick} />;
        },
    },
];

export default function PilotList(props: { enabled: boolean }) {
    const data = () => trafficRadar.getPilotList();
    return <NetworkList enabled={props.enabled} columns={pilotColumns} values={data} />;
}
