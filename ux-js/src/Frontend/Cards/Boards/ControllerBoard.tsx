import { Typography } from "@mui/material";
import { Column } from "./Elements/DynamicBoard";
import NetworkBoard from "./Elements/NetworkBoard";
import OpenButton from "./OpenButton";
import { compareIgnoreCase } from "../Shared";
import NetworkController from "../../../Backend/NetworkUplink/Source/Objects/NetworkController";
import NetworkAtis from "../../../Backend/NetworkUplink/Source/Objects/NetworkAtis";

export const controllerColumns: Column<NetworkController | NetworkAtis>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: data => {
            const data2 = data as NetworkController;
            const color = data.station || data2.substation ? undefined : 'error';
            return <Typography color={color} variant='inherit'>{data.data.callsign}</Typography>;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.data.callsign, b.data.callsign);
        },
    },
    {
        width: 100,
        id: 'freq',
        label: 'Frequency',
        data: data => {
            return data.data.frequency;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.data.frequency, b.data.frequency);
        },
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: data => data.data.name,
        compare: (a, b) => {
            return compareIgnoreCase(a.data.name, b.data.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            const onClick = () => {
                if (data instanceof NetworkAtis) {
                    cards.showAtisCard(data);
                } else {
                    cards.showControllerCard(data);
                }
            };
            return <OpenButton onClick={onClick} />;
        },
    },
];

export default function ControllerList(props: { enabled: boolean }) {
    const data = () => controlRadar.getControllerList();
    return <NetworkBoard enabled={props.enabled} columns={controllerColumns} values={data} />;
}
