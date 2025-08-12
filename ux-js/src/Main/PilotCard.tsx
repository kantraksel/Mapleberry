import { Divider, Grid, Stack, Typography } from '@mui/material';
import { NetworkState, Pilot } from '../Network/NetworkWorld';
import { createStationNames, getEnrouteTime, getFlightplan, getFlightRules, getPilotRating, getTimeOnline, InfoBox, TextBox } from './CardsShared';
import { useEffect, useState } from 'react';

function PilotCard() {
    const [data, setData] = useState<Pilot>();
    const [stationNames, setStationNames] = useState(createStationNames());
    const [present, setPresent] = useState(true);

    useEffect(() => {
        cards.pilotRef = value => {
            setData(value);
            setStationNames(createStationNames(value));
            setPresent(true);
        };

        return () => {
            cards.pilotRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }

        const handler = (state?: NetworkState) => {
            if (!state) {
                cards.close();
                return;
            }

            const value = state.pilots.find(value => (value.cid === data.cid));
            if (value) {
                setData(value);
                setStationNames(createStationNames(value));
                setPresent(true);
            } else {
                setPresent(false);
            }
        };
        network.Update.add(handler);

        return () => {
            network.Update.delete(handler);
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

    const headerColor = present ? 'inherit' : '#8b8b8b';

    return (
        <InfoBox width='auto' maxWidth='100vw'>
            <Typography variant='h4' sx={{ fontSize: '2.0rem', lineHeight: '1.5', color: headerColor }}>{data.callsign}</Typography>
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
            <TextBox label='Route' value={flightplan.route} />
            <TextBox label='Remarks' value={flightplan.remarks} />
        </InfoBox>
    );
}
export default PilotCard;
