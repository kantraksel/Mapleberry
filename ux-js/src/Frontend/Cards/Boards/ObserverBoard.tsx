import { Controller } from "../../../Backend/NetworkUplink/Source/Objects/LiveNetworkData";
import NetworkController from "../../../Backend/NetworkUplink/Source/Objects/NetworkController";
import { compareIgnoreCase } from "../Shared";
import { Column } from "./Elements/DynamicBoard";
import NetworkBoard from "./Elements/NetworkBoard";
import OpenButton from "./OpenButton";

const observerColumns: Column<Controller>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: 'callsign',
        compare: (a, b) => compareIgnoreCase(a.callsign, b.callsign),
    },
    {
        width: 100,
        id: 'freq',
        label: 'Frequency',
        data: 'frequency',
        compare: (a, b) => compareIgnoreCase(a.frequency, b.frequency),
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: 'name',
        compare: (a, b) => compareIgnoreCase(a.name, b.name),
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            const onClick = () => {
                cards.showControllerCard(new NetworkController(data, undefined));
            };
            return <OpenButton onClick={onClick} />;
        },
    },
];

export default function ObserverList(props: { enabled: boolean }) {
    const data = () => network.getState()?.observers;
    return <NetworkBoard enabled={props.enabled} columns={observerColumns} values={data} />;
}
