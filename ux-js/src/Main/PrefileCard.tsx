import { Stack, TextField, Typography } from '@mui/material';
import { NetworkStations, Prefile } from '../Network/VATSIM';
import { createStationNames, getEnrouteTime, getFlightplan, getFlightRules, InfoBox } from './CardsShared';
import { useEffect, useState } from 'react';

interface StationNames {
    departure: string,
    arrival: string,
    alternate: string,
}

function PrefileCard() {
    const [data, setData] = useState<Prefile>();
    const [stationNames, setStationNames] = useState<StationNames>(createStationNames());

    useEffect(() => {
        cards.prefileRef = value => {
            setData(value);
            setStationNames(createStationNames(value));
        };

        return () => {
            cards.pilotRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }

        const handler = (networkData?: NetworkStations) => {
            if (!networkData) {
                cards.close();
                return;
            }

            const value = networkData.prefiles.find(value => (value.cid === data.cid));
            if (value) {
                setData(value);
                setStationNames(createStationNames(value));
            }
        };
        vatsim.Update.add(handler);

        return () => {
            vatsim.Update.delete(handler);
        };
    }, [data]);
    
    if (!data) {
        return <></>;
    }

    const flightplan = getFlightplan(data);
    const flightRules = getFlightRules(flightplan);
    const enrouteTime = getEnrouteTime(flightplan);

    return (
        <InfoBox width='100vw' maxWidth={500}>
            <Typography variant='h4' sx={{ fontSize: '2.0rem', lineHeight: '1.5' }}>{data.callsign}</Typography>
            <Stack useFlexGap direction='row' spacing={3} sx={{ ml: '7px', mr: '7px', width: 'stretch' }}>
                <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Stack>
                        <Typography>Name:</Typography>
                        <Typography>Flight Rules:</Typography>
                        <Typography>Enroute Time:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{data.name}</Typography>
                        <Typography>{flightRules}</Typography>
                        <Typography>{enrouteTime}</Typography>
                    </Stack>
                </Stack>
                <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Stack>
                        <Typography>Aircraft:</Typography>
                        <Typography>Cruise Altitude:</Typography>
                        <Typography>Cruise TAS:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{flightplan.aircraft_faa}</Typography>
                        <Typography>{flightplan.altitude}</Typography>
                        <Typography>{flightplan.cruise_tas}</Typography>
                    </Stack>
                </Stack>
            </Stack>
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
            <TextField variant='outlined' fullWidth sx={{ mt: '15px' }} label='Route' value={flightplan.route} />
            <TextField variant='outlined' fullWidth sx={{ mt: '15px' }} label='Remarks' value={flightplan.remarks} />
        </InfoBox>
    );
}
export default PrefileCard;
