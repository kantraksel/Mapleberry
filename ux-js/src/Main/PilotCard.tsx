import { Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { Pilot } from '../Network/VATSIM';
import { getEnrouteTime, getFlightplan, getFlightRules, getPilotRating, getTimeOnline, InfoBox } from './CardsShared';
import { useEffect, useState } from 'react';

function PilotCard() {
    const [data, setData] = useState<Pilot>();

    useEffect(() => {
        cards.setPilotCard(setData);

        return () => {
            cards.setPilotCard(undefined);
        };
    }, []);
    
    if (!data) {
        return <></>;
    }

    const flightplan = getFlightplan(data);
    const rating = getPilotRating(data);
    const timeOnline = getTimeOnline(data);
    const flightRules = getFlightRules(flightplan);
    const enrouteTime = getEnrouteTime(flightplan);

    return (
        <InfoBox width={500} height={'auto'}>
            <Typography variant='h4'>{data.callsign}</Typography>
            <Stack useFlexGap direction='row' spacing={3} sx={{ mt: '5px', ml: '7px', mr: '7px', width: 'stretch' }}>
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
                    <Typography>{flightplan.departure}</Typography>
                    <Typography>{flightplan.arrival}</Typography>
                    <Typography>{flightplan.alternate}</Typography>
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
