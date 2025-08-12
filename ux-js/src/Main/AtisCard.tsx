import { Stack, Typography } from '@mui/material';
import { Atis, NetworkState } from '../Network/NetworkWorld';
import { getTimeOnline, InfoBox, TextBox } from './CardsShared';
import { useEffect, useState } from 'react';

function AtisCard() {
    const [data, setData] = useState<Atis>();
    const [present, setPresent] = useState(true);

    useEffect(() => {
        cards.atisRef = data => {
            setData(data);
            setPresent(true);
        };

        return () => {
            cards.atisRef = undefined;
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

            const value = state.atis.find(value => (value.cid === data.cid));
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

    const timeOnline = getTimeOnline(data);
    const info = data.text_atis?.join(' ') ?? 'N/A';

    const headerColor = present ? 'inherit' : '#8b8b8b';

    return (
        <InfoBox width={500} maxWidth='100vw'>
            <Typography variant='h4' sx={{ fontSize: '2.0rem', lineHeight: '1.5', color: headerColor }}>{data.callsign}</Typography>
            <Stack direction='row' spacing={3} sx={{ pl: '14px', pr: '14px', width: '100%', justifyContent: 'space-between' }}>
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
            <TextBox label='Information' value={info} />
        </InfoBox>
    );
}
export default AtisCard;
