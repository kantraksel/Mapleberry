import { Prefile } from "../../../Backend/NetworkUplink/Source/Objects/LiveNetworkData";
import { compareIgnoreCase } from "../Shared";
import { Column } from "./Elements/DynamicBoard";
import NetworkBoard from "./Elements/NetworkBoard";
import OpenButton from "./OpenButton";

const prefileColumns: Column<Prefile>[] = [
    {
        width: 135,
        id: 'callsign',
        label: 'Callsign',
        data: 'callsign',
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 100,
        id: 'type',
        label: 'Type',
        data: (pilot) => {
            if (!pilot.flight_plan) {
                return '';
            }
            return pilot.flight_plan.aircraft_short;
        },
        compare: (a, b) => {
            const one = a.flight_plan;
            const two = b.flight_plan;

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
        width: 219,
        id: 'cid',
        label: 'CID',
        data: 'cid',
        compare: (a, b) => {
            return a.cid - b.cid;
        },
    },
    {
        width: 60,
        id: 'buttons',
        label: '',
        data: data => {
            const onClick = () => {
                cards.showPrefileCard(data);
            };
            return <OpenButton onClick={onClick} />;
        },
    },
];

export default function PrefileList(props: { enabled: boolean }) {
    const data = () => network.getState()?.prefiles;
    return <NetworkBoard enabled={props.enabled} columns={prefileColumns} values={data} />;
}
