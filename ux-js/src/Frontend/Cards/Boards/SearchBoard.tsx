import { ReactNode, useEffect, useState } from "react";
import { compareIgnoreCase, createNetUpdate } from "../Shared";
import { Atis, Controller, Pilot, Prefile } from "../../../Backend/NetworkUplink/Source/Objects/LiveNetworkData";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { CardCloseButton } from "../Elements/CardCloseButton";
import DynamicBoard, { Column } from "./Elements/DynamicBoard";
import OpenButton from "./OpenButton";
import NetworkController from "../../../Backend/NetworkUplink/Source/Objects/NetworkController";

const searchColumns: Column<SearchResult>[] = [
    {
        width: 120,
        id: 'callsign',
        label: 'Callsign',
        data: data => {
            const color = data.markCallsign ? 'error' : undefined;
            return <Typography color={color} variant='inherit'>{data.callsign}</Typography>;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.callsign, b.callsign);
        },
    },
    {
        width: 100,
        id: 'type',
        label: 'Freq/Type',
        data: data => {
            return data.freq_type;
        },
        compare: (a, b) => {
            return compareIgnoreCase(a.freq_type, b.freq_type);
        },
        alignData: 'center',
    },
    {
        width: 180,
        id: 'name',
        label: 'Name',
        data: data => data.name,
        compare: (a, b) => {
            return compareIgnoreCase(a.name, b.name);
        },
    },
    {
        width: 50,
        id: 'buttons',
        label: '',
        data: data => {
            return <OpenButton disabled={!data.onOpen} onClick={data.onOpen} />;
        },
    },
];

interface SearchResult {
    callsign: string,
    name: string;
    freq_type: string,
    onOpen?: () => void;
    markCallsign?: boolean;
}

export default function SearchBoard(props: { open: boolean, toolsLeft: ReactNode }) {
    const [rev, setRev] = useState(0);
    const [value, setValue] = useState('');

    useEffect(() => {
        if (!props.open) {
            return;
        }
        return createNetUpdate(() => {
            setRev(rev + 1);
        });
    }, [rev, props.open]);

    const display = props.open ? 'flex' : 'none';
    const empty = !props.open || value.length < 3;
    const emptyLabel = empty ? 'You need to type at least 3 characters' : undefined;

    const onChange = (e: { target: { value: string }}) => {
        setValue(e.target.value);
    };

    const data = () => {
        if (value.length < 3) {
            return [];
        }
        let regexp;
        try {
            regexp = new RegExp(value);
        } catch (e) {
            return [];
        }
        const valueUpper = value.toUpperCase();
        const results: SearchResult[] = [];

        const forEachPilotLike = (data: Pilot | Prefile, onCreate: (obj: SearchResult) => void) => {
            const callsign = data.callsign;
            const name = data.name;
            const aircraft = data.flight_plan?.aircraft_short ?? '';
            if (!callsign.includes(valueUpper) &&
                !name.toUpperCase().includes(valueUpper) &&
                !aircraft.includes(valueUpper) &&
                !regexp.test(callsign) &&
                !regexp.test(name) &&
                !regexp.test(aircraft)
            ) {
                return;
            }
            const obj = {
                callsign,
                name,
                freq_type: aircraft,
            };
            onCreate(obj);
            results.push(obj);
        };
        const forEachControllerLike = (data: Controller | Atis, onCreate: (obj: SearchResult) => void) => {
            const callsign = data.callsign;
            const name = data.name;
            const frequency = data.frequency;
            if (!callsign.includes(valueUpper) &&
                !name.toUpperCase().includes(valueUpper) &&
                !frequency.includes(valueUpper) &&
                !regexp.test(callsign) &&
                !regexp.test(name) &&
                !regexp.test(frequency)
            ) {
                return;
            }
            const obj = {
                callsign,
                name,
                freq_type: frequency,
            };
            onCreate(obj);
            results.push(obj);
        };

        const pilots = trafficRadar.getPilotList();
        const controllers = controlRadar.getControllerList();
        const prefiles = network.getState()?.prefiles ?? [];
        const observers = network.getState()?.observers ?? [];
        const atis = controlRadar.getAtisList();

        controllers.forEach(value => {
            forEachControllerLike(value.data, obj => {
                obj.onOpen = () => cards.showControllerCard(value);
                obj.markCallsign = !value.station && !value.substation;
            });
        });
        atis.forEach(value => {
            forEachControllerLike(value.data, obj => {
                obj.onOpen = () => cards.showAtisCard(value);
            });
        });
        pilots.forEach(value => {
            forEachPilotLike(value.pilot, obj => {
                obj.onOpen = () => cards.showPilotCard(value);
            });
        });
        observers.forEach(value => {
            forEachControllerLike(value, obj => {
                obj.onOpen = () => cards.showControllerCard(new NetworkController(value, undefined));
            });
        });
        prefiles.forEach(value => {
            forEachPilotLike(value, obj => {
                obj.onOpen = () => cards.showPrefileCard(value);
            });
        });

        return results;
    };

    return (
        <Box sx={{ display, width: 'stretch', height: '100%', flexDirection: 'column' }}>
            <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', minHeight: '48px' }}>
                <Stack direction='row' sx={{ alignItems: 'center', paddingLeft: '2px', paddingRight: '4px', paddingBottom: '3px' }}>
                    {props.toolsLeft}
                </Stack>
                <Box sx={{ flex: '1 1 auto', display: 'flex', alignItems: 'center' }}>
                    <TextField variant='outlined' size='small' sx={{ flex: '1 1 auto' }} onChange={onChange} />
                </Box>
                <Stack direction='row-reverse' sx={{ alignItems: 'center', paddingLeft: '4px', paddingRight: '2px', paddingBottom: '3px' }}>
                    <CardCloseButton />
                </Stack>
            </Box>
            <DynamicBoard enabled={props.open} columns={searchColumns} values={data} replaceLabel={emptyLabel} />
        </Box>
    );
}
