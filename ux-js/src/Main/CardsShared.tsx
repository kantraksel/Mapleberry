import { ReactNode } from 'react';
import { Controller, FlightPlan, Pilot } from '../Network/VATSIM';
import { IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export function InfoBox(props: { children?: ReactNode, width: number | string, height: number | string, onClose: () => void }) {
    const style = {
        position: 'relative',
        border: `3px solid #2c2c2c`,
        borderRadius: '5px',
        background: '#2c2c2c',
        minWidth: props.width,
        minHeight: props.height,
        margin: '15px',
        alignItems: 'center',
        padding: '5px',
        paddingLeft: '7px',
        paddingRight: '7px',
        paddingBottom: '7px',
        zIndex: 5,
        boxShadow: '0 26px 58px 0 rgba(0, 0, 0, .22), 0 5px 14px 0 rgba(0, 0, 0, .18)',
    };
    return (
        <Stack sx={style}>
            <Stack position='absolute' right='5px' direction='row-reverse'>
                <IconButton onClick={props.onClose}><CloseIcon /></IconButton>
            </Stack>
            {props.children}
        </Stack>
    );
}

export function getPilotRating(pilot: Pilot) {
    if (pilot.military_rating > 0) {
        const ratings = vatsim.getMilitaryRatings();
        const value = ratings.find((value) => (value.id === pilot.military_rating));
        if (value) {
            return `${value.short_name} ${value.long_name}`;
        }
    }

    const ratings = vatsim.getPilotRatings();
    const value = ratings.find((value) => (value.id === pilot.pilot_rating));
    if (value) {
        return `${value.short_name} ${value.long_name}`;
    }

    return 'Unknown';
}

export function getControllerRating(controller: Controller) {
    const ratings = vatsim.getControllerRatings();
    const value = ratings.find((value) => (value.id === controller.rating));
    if (value) {
        return `${value.short} ${value.long}`;
    }

    return 'Unknown';
}

export function getStation(controller: Controller) {
    const facilities = vatsim.getFacilities();
    const value = facilities.find((value) => (value.id === controller.facility));
    if (value) {
        return `${value.long} ${controller.frequency}`;
    }

    return `Unknown ${controller.frequency}`;
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

interface StationNames {
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
