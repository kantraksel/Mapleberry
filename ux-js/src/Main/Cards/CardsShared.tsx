import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Controller, FlightPlan, Pilot } from '../../Network/VATSIM';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { NetworkState } from '../../Network/NetworkWorld';

export function CardBase(props: { children?: ReactNode, width: number | string, maxWidth: number | string }) {
    const style = {
        position: 'relative',
        border: `3px solid #2c2c2c`,
        borderRadius: '5px',
        background: '#2c2c2c',
        width: props.width,
        maxWidth: props.maxWidth,
        margin: '15px',
        alignItems: 'center',
        paddingLeft: '7px',
        paddingRight: '7px',
        paddingBottom: '7px',
        zIndex: 5,
        boxShadow: '0 26px 58px 0 rgba(0, 0, 0, .22), 0 5px 14px 0 rgba(0, 0, 0, .18)',
    };
    return (
        <Stack sx={style}>
            {props.children}
        </Stack>
    );
}

export function StationTitle(props: { title: string, absent: boolean, onClick?: () => void }) {
    const style = {
        fontSize: '2.0rem',
        lineHeight: '1.5',
        color: props.absent ? '#8b8b8b' : 'inherit',
    };

    if (props.onClick) {
        return (
            <Tooltip title='Go to blip'>
                <Button sx={{ padding: 0, color: 'inherit' }} onClick={props.onClick}>
                    <Typography variant='h4' sx={style}>{props.title}</Typography>
                </Button>
            </Tooltip>
        );
    }
    return <Typography variant='h4' sx={style}>{props.title}</Typography>;
}

export function StationCardBase(props: { children?: ReactNode, width: number | string, maxWidth: number | string, title: string, absent: boolean, onTitleClick?: () => void }) {
    return (
        <CardBase width={props.width} maxWidth={props.maxWidth}>
            <StationTitle title={props.title} absent={props.absent} onClick={props.onTitleClick} />
            {props.children}
        </CardBase>
    );
}

export function StationCard(props: { children?: ReactNode, width: number | string, maxWidth: number | string, title: string, absent: boolean, onTitleClick?: () => void }) {
    return (
        <CardBase width={props.width} maxWidth={props.maxWidth}>
            <CardLeftToolbar />
            <CardRightToolbar />
            <StationTitle title={props.title} absent={props.absent} onClick={props.onTitleClick} />
            {props.children}
        </CardBase>
    );
}

export function CardRightToolbar(props: { children?: ReactNode }) {
    return (
        <Stack direction='row-reverse' sx={{ position: 'absolute', right: '5px', mt: '3px' }}>
            <IconButton onClick={() => cards.close()}><CloseIcon /></IconButton>
            {props.children}
        </Stack>
    );
}

export function CardLeftToolbar(props: { children?: ReactNode }) {
    return (
        <Stack direction='row' sx={{ position: 'absolute', left: '5px', mt: '3px' }}>
            <IconButton onClick={() => cards.goBack()}><ArrowBackIosNewIcon /></IconButton>
            {props.children}
        </Stack>
    );
}

export function TextBox(props: { label: string, value: string }) {
    const [mouseOver, setMouseOver] = useState(false);
    const textArea = useRef<HTMLTextAreaElement>(null);
    const id = useId();

    useEffect(() => {
        const elem = textArea.current!;

        elem.style.height = '0';
        if (elem.value.slice(-1) == '\n') {
            elem.value += ' ';
        }
        const offset = elem.clientWidth < elem.scrollWidth ? 10 : 6;
        elem.style.height = `${elem.scrollHeight + offset}px`;
    }, [ props.value ]);

    const labelColor = mouseOver ? '#90caf9' : '#ffffffb3';
    const borderColor = mouseOver ? '#90caf9' : '#ffffff3b';
    const borderWidth = mouseOver ? '2px' : '1px';

    return (
        <Box sx={{ width: '100%', position: 'relative', display: 'inline-flex', flexDirection: 'column', marginTop: '15px' }}>
            <label id={`${id}-label`} htmlFor={id} style={{ color: labelColor, position: 'absolute', left: 0, top: 0, fontFamily: '"Roboto","Helvetica","Arial",sans-serif', fontWeight: 400, lineHeight: '1.4375em', letterSpacing: '0.00938em', transform: 'translate(17px, -8px)', fontSize: '0.75em' }}>{props.label}</label>
            <Box sx={{ width: '100%', position: 'relative', display: 'inline-flex', alignItems: 'center', fontFamily: '"Roboto","Helvetica","Arial",sans-serif', fontWeight: 400, fontSize: '1rem', lineHeight: '1.4375em', letterSpacing: '0.00938em', color: '#fff', paddingTop: '10px', paddingLeft: '3px', paddingRight: '3px' }}>
                <textarea id={id} ref={textArea} onMouseEnter={() => setMouseOver(true)} onMouseLeave={() => setMouseOver(false)} style={{ width: '100%', resize: 'none', background: 'none', border: 0, font: 'inherit', color: 'currentColor', boxSizing: 'content-box', scrollbarWidth: 'thin', scrollbarColor: 'gray #4C4C4C', outline: 0, paddingLeft: '10px', paddingRight: '10px', paddingBottom: '2px' }} readOnly wrap='off' value={props.value}></textarea>
                <fieldset style={{ position: 'absolute', left: 0, right: 0, top: '-5px', bottom: 0, padding: '0 8px', borderRadius: '4px', borderStyle: 'solid', borderWidth: borderWidth, overflow: 'hidden', borderColor: borderColor, pointerEvents: 'none' }}>
                    <legend style={{ height: '11px', fontSize: '0.75em', visibility: 'hidden' }}><span style={{ paddingLeft: '5px', paddingRight: '5px', visibility: 'visible', opacity: 0 }}>{props.label}</span></legend>
                </fieldset>
            </Box>
        </Box>
    );
}

export function getPilotRating(pilot: Pilot) {
    if (pilot.military_rating > 0) {
        const ratings = network.getMilitaryRatings();
        const value = ratings.find(value => (value.id === pilot.military_rating));
        if (value) {
            return `${value.short_name} ${value.long_name}`;
        }
    }

    const ratings = network.getPilotRatings();
    const value = ratings.find(value => (value.id === pilot.pilot_rating));
    if (value) {
        return `${value.short_name} ${value.long_name}`;
    }

    return 'Unknown';
}

export function getControllerRating(controller: Controller) {
    const ratings = network.getControllerRatings();
    const value = ratings.find(value => (value.id === controller.rating));
    if (value) {
        return `${value.short_name} ${value.long_name}`;
    }

    return 'Unknown';
}

export function getStation(controller: Controller) {
    let name = 'Unknown';

    const facilities = network.getFacilities();
    const value = facilities.find(value => (value.id === controller.facility));
    if (value) {
        name = value.long;
        if (value.id === network.getApproachId()) {
            let suffix = controller.callsign.split(/[-_]/).pop();
            if (suffix) {
                suffix = suffix.toUpperCase();
                if (suffix === 'DEP') {
                    name = 'Departure';
                } else if (suffix === 'APP') {
                    name = 'Approach';
                }
            }
        }
    }

    return `${name} ${controller.frequency}`;
}

export function getTimeOnline(data: { logon_time: string }) {
    const date = new Date(data.logon_time);
    let hours = Date.now() - date.getTime();
    hours = hours / 1000 / 60;
    const minutes = Math.floor(hours % 60);
    hours = Math.floor(hours / 60);

    const minStr = minutes.toString().padStart(2, '0');
    return `${hours}:${minStr}`;
}

export function getFlightplan(data: { flight_plan?: FlightPlan }): FlightPlan {
    if (data.flight_plan) {
        return data.flight_plan;
    }

    return {
        flight_rules: 'N/A',
        aircraft: 'N/A',
        aircraft_faa: 'N/A',
        aircraft_short: 'N/A',
        departure: 'N/A',
        arrival: 'N/A',
        alternate: 'N/A',
        deptime: 'N/A',
        enroute_time: 'N/A',
        fuel_time: 'N/A',
        remarks: 'N/A',
        route: 'N/A',
        revision_id: 0,
        assigned_transponder: 'N/A',

        cruise_tas: 'N/A',
        altitude: 'N/A',
    };
}

export function getFlightRules(plan: FlightPlan) {
    if (plan.flight_rules == 'I') {
        return 'IFR';
    } else if (plan.flight_rules == 'V') {
        return 'VFR';
    } else {
        return plan.flight_rules;
    }
}

export function getEnrouteTime(plan: FlightPlan) {
    try {
        let hours = Number.parseInt(plan.enroute_time);
        const minutes = hours % 100;
        hours = (hours - minutes) / 100;

        const minStr = minutes.toString().padStart(2, '0');
        return `${hours}:${minStr}`;
    } catch {
        return plan.enroute_time;
    }
}

export interface StationNames {
    departure: string,
    arrival: string,
    alternate: string,
}

export function createStationNames(data?: { flight_plan?: FlightPlan }): StationNames {
    const names = {
        departure: '',
        arrival: '',
        alternate: '',
    };

    if (!data) {
        return names;
    }
    const plan = data.flight_plan;
    if (!plan) {
        return names;
    }

    let airport = controlStations.getAirportByIcao(plan.departure);
    if (airport) {
        names.departure = airport.name;
    }
    airport = controlStations.getAirportByIcao(plan.arrival);
    if (airport) {
        names.arrival = airport.name;
    }
    airport = controlStations.getAirportByIcao(plan.alternate);
    if (airport) {
        names.alternate = airport.name;
    }
    return names;
}

export function createNetUpdate(onUpdate: (state: NetworkState) => void) {
    const handler = (state?: NetworkState) => {
        if (!state) {
            cards.close();
            return;
        }
        onUpdate(state);
    };
    network.Update.add(handler);

    return () => {
        network.Update.delete(handler);
    };
}

export function createControlRadarUpdate(onUpdate: () => void) {
    const handler = () => {
        onUpdate();
    };
    controlRadar.Update.add(handler);

    return () => {
        controlRadar.Update.delete(handler);
    };
}

export function DataTable(props: { data: string[][][] }) {
    let i = 0; // ignore react warning - data layout is always fixed
    const parts = props.data.map(part => {
        const columns = part.map(column => {
            const names = column.map(name => {
                return <Typography key={++i}>{name}</Typography>;
            });
            return <Stack key={++i}>{names}</Stack>;
        });
        return <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }} key={++i}>{columns}</Stack>;
    });
    return <Stack useFlexGap direction='row' spacing={3} sx={{ ml: '7px', mr: '7px', width: 'stretch' }}>{parts}</Stack>;
}

export function RouteBox(props: { flight_plan: FlightPlan }) {
    const [stationNames, setStationNames] = useState(createStationNames());

    useEffect(() => {
        setStationNames(createStationNames(props));
    }, [props.flight_plan]);

    const flightplan = props.flight_plan;
    const flightRules = getFlightRules(flightplan);
    const enrouteTime = getEnrouteTime(flightplan);

    const table = [
        [
            ['Flight Rules:', 'Enroute Time:'],
            [flightRules, enrouteTime],
        ],
        [
            ['Cruise Altitude:', 'Cruise TAS:'],
            [flightplan.altitude, flightplan.cruise_tas],
        ],
    ];

    return (
        <>
            <Typography variant='h5'>Flight Plan</Typography>
            <Stack useFlexGap direction='row' spacing={1} sx={{ mt: '5px', ml: '7px', mr: '7px', width: 'stretch' }}>
                <Stack>
                    <Typography>Departure:</Typography>
                    <Typography>Arrival:</Typography>
                    <Typography>Alternate:</Typography>
                </Stack>
                <Stack>
                    <Typography>{flightplan.departure} {stationNames.departure}</Typography>
                    <Typography>{flightplan.arrival} {stationNames.arrival}</Typography>
                    <Typography>{flightplan.alternate} {stationNames.alternate}</Typography>
                </Stack>
            </Stack>
            <DataTable data={table} />
            <TextBox label='Route' value={flightplan.route} />
            <TextBox label='Remarks' value={flightplan.remarks} />
        </>
    );
}
