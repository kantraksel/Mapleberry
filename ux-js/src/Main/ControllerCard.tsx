import { Stack, TextField, Typography } from '@mui/material';
import { Controller, NetworkStations } from '../Network/VATSIM';
import { getControllerRating, getStation, getTimeOnline, InfoBox } from './CardsShared';
import { useEffect, useState } from 'react';

function ControllerCard() {
    const [data, setData] = useState<Controller>();

    useEffect(() => {
        cards.controllerRef = setData;

        return () => {
            cards.controllerRef = undefined;
        };
    }, []);

    useEffect(() => {
        const handler = (networkData?: NetworkStations) => {
            if (!data) {
                return;
            }

            if (!networkData) {
                cards.close();
                return;
            }

            const value = networkData.controllers.find((value) => (value.cid === data.cid));
            if (value) {
                setData(value);
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

    const rating = getControllerRating(data);
    const timeOnline = getTimeOnline(data);
    const station = getStation(data);
    const info = data.text_atis?.join('\n') ?? 'N/A';

    return (
        <InfoBox width='auto' maxWidth='100vw'>
            <Typography variant='h4' sx={{ fontSize: '2.0rem', lineHeight: '1.5' }}>{data.callsign}</Typography>
            <Stack direction='row' spacing={3} sx={{ ml: '7px', mr: '7px' }}>
                <Stack direction='row' spacing={1}>
                    <Stack>
                        <Typography>Name:</Typography>
                        <Typography>Station:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{data.name}</Typography>
                        <Typography>{station}</Typography>
                    </Stack>
                </Stack>
                <Stack direction='row' spacing={1}>
                    <Stack>
                        <Typography>Controller Rating:</Typography>
                        <Typography>Time Online:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{rating}</Typography>
                        <Typography>{timeOnline}</Typography>
                    </Stack>
                </Stack>
            </Stack>
            <TextField variant='outlined' multiline fullWidth sx={{ mt: '15px', '& .MuiInputBase-inputMultiline': { whiteSpace: 'pre', overflowX: 'auto' } }} label='Information' value={info} />
        </InfoBox>
    );
}
export default ControllerCard;
