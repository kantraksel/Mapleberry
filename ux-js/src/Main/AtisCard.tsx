import { Stack, TextField, Typography } from '@mui/material';
import { Atis, NetworkStations } from '../Network/VATSIM';
import { getTimeOnline, InfoBox } from './CardsShared';
import { useEffect, useState } from 'react';

function AtisCard() {
    const [data, setData] = useState<Atis>();

    useEffect(() => {
        cards.atisRef = setData;

        return () => {
            cards.atisRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }
        const handler = (networkData?: NetworkStations) => {
            if (!networkData) {
                setData(undefined);
                return;
            }

            const value = networkData.atis.find(value => (value.cid === data.cid));
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

    const timeOnline = getTimeOnline(data);
    const info = data.text_atis?.join(' ') ?? 'N/A';

    const onClose = () => {
        setData(undefined);
    };

    return (
        <InfoBox width={500} height={'auto'} onClose={onClose}>
            <Typography variant='h4'>{data.callsign}</Typography>
            <Stack direction='row' spacing={3} sx={{ mt: '5px', pl: '14px', pr: '14px', width: '100%', justifyContent: 'space-between' }}>
                <Stack direction='row' spacing={1}>
                    <Stack>
                        <Typography>Name:</Typography>
                        <Typography>Station:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{data.name}</Typography>
                        <Typography>{data.frequency}</Typography>
                    </Stack>
                </Stack>
                <Stack direction='row' spacing={1}>
                    <Stack>
                        <Typography>Time Online:</Typography>
                        <Typography>ATIS Code:</Typography>
                    </Stack>
                    <Stack>
                        <Typography>{timeOnline}</Typography>
                        <Typography>{data.atis_code}</Typography>
                    </Stack>
                </Stack>
            </Stack>
            <TextField variant='outlined' multiline fullWidth sx={{ mt: '15px' }} label='Information' value={info} />
        </InfoBox>
    );
}
export default AtisCard;
