import { Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { NetworkStations, Pilot } from '../Network/VATSIM';
import { createStationNames, getEnrouteTime, getFlightplan, getFlightRules, getPilotRating, getTimeOnline, InfoBox } from './CardsShared';
import { useEffect, useState } from 'react';

interface StationNames {
    departure: string,
    arrival: string,
    alternate: string,
}

function PilotCard() {
    const [data, setData] = useState<Pilot>();
    const [stationNames, setStationNames] = useState<StationNames>(createStationNames());

    useEffect(() => {
        cards.pilotRef = value => {
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

            const value = networkData.pilots.find(value => (value.cid === data.cid));
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
    const rating = getPilotRating(data);
    const timeOnline = getTimeOnline(data);
    const flightRules = getFlightRules(flightplan);
    const enrouteTime = getEnrouteTime(flightplan);

    return (
        <InfoBox width='auto' maxWidth='100vw'>
            <Typography variant='h4' sx={{ fontSize: '2.0rem', lineHeight: '1.5' }}>{data.callsign}</Typography>
            <Stack useFlexGap direction='row' spacing={3} sx={{ ml: '7px', mr: '7px', width: 'stretch' }}>
                <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Stack>
                        <Typography>Name:</Typography>
                        <Typography>Aircraft:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{data.name}</Typography>
                        <Typography>{flightplan.aircraft_faa}</Typography>
                    </Stack>
                </Stack>
                <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Stack>
                        <Typography>Pilot Rating:</Typography>
                        <Typography>Time Online:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{rating}</Typography>
                        <Typography>{timeOnline}</Typography>
                    </Stack>
                </Stack>
            </Stack>
            <Divider flexItem sx={{ mt: '5px', mb: '5px' }} />
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
            <Grid container columnSpacing={3} sx={{ ml: '7px', mr: '7px', width: 'stretch' }}>
                <Grid size='grow'>
                    <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                        <Stack>
                            <Typography>Flight Rules:</Typography>
                            <Typography>Enroute Time:</Typography>
                        </Stack>
                        <Stack>
                            <Typography>{flightRules}</Typography>
                            <Typography>{enrouteTime}</Typography>
                        </Stack>
                    </Stack>
                </Grid>
                <Grid size='grow'>
                    <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                        <Stack>
                            <Typography>Cruise Altitude:</Typography>
                            <Typography>Cruise TAS:</Typography>
                        </Stack>
                        <Stack>
                            <Typography>{flightplan.altitude}</Typography>
                            <Typography>{flightplan.cruise_tas}</Typography>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
            <TextField variant='outlined' fullWidth sx={{ mt: '15px' }} label='Route' value={flightplan.route} />
            <TextField variant='outlined' fullWidth sx={{ mt: '15px' }} label='Remarks' value={flightplan.remarks} />
        </InfoBox>
    );
}
export default PilotCard;
