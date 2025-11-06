import { useEffect, useState } from "react";
import { FlightPlan } from "../../../Backend/Network/VATSIM";
import { Stack, Typography } from "@mui/material";
import { DataTable } from "./DataTable";
import { TextBox } from "./TextBox";

export function getFlightRules(plan: FlightPlan) {
    if (plan.flight_rules == 'I') {
        return 'IFR';
    } else if (plan.flight_rules == 'V') {
        return 'VFR';
    } else {
        return plan.flight_rules;
    }
}

function getEnrouteTime(plan: FlightPlan) {
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

function createStationNames(data?: { flight_plan?: FlightPlan }) {
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
