import { Stack, Typography } from '@mui/material';
import { Controller, NetworkState } from '../Network/NetworkWorld';
import { getControllerRating, getStation, getTimeOnline, InfoBox, TextBox } from './CardsShared';
import { useEffect, useState } from 'react';

function ControllerCard() {
    const [data, setData] = useState<Controller>();
    const [present, setPresent] = useState(true);

    useEffect(() => {
        cards.controllerRef = data => {
            setData(data);
            setPresent(true);
        };

        return () => {
            cards.controllerRef = undefined;
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

            const value = state.controllers.find(value => (value.cid === data.cid));
            if (value) {
                setData(value);
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

    const rating = getControllerRating(data);
    const timeOnline = getTimeOnline(data);
    const station = getStation(data);
    const info = data.text_atis?.join('\n') ?? 'N/A';

    const headerColor = present ? 'inherit' : '#8b8b8b';

    return (
        <InfoBox width='auto' maxWidth='100vw'>
            <Typography variant='h4' sx={{ fontSize: '2.0rem', lineHeight: '1.5', color: headerColor }}>{data.callsign}</Typography>
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
            <TextBox label='Information' value={info} />
        </InfoBox>
    );
}
export default ControllerCard;
