import { Stack, TextField, Typography } from '@mui/material';
import { ReactNode } from 'react';

function InfoBox(props: { children?: ReactNode, width: number | string, height: number | string }) {
    const style = {
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
    };
    return (
        <Stack sx={style}>
            {props.children}
        </Stack>
    );
}

function ControllerCard(props: { open: boolean }) {
    if (!props.open) {
        return <></>;
    }

    const info = ['', '', ''].join('\n');

    return (
        <InfoBox width={'500px'} height={'auto'}>
            <Typography variant='h4'>_CALLSIGN_</Typography>
            <Stack direction='row' spacing={3} sx={{ mt: '5px', ml: '7px', mr: '7px' }}>
                <Stack direction='row' spacing={1}>
                    <Stack>
                        <Typography>Name:</Typography>
                        <Typography>Station:</Typography>
                    </Stack>
                    <Stack>
                        <Typography></Typography>
                        <Typography></Typography>
                    </Stack>
                </Stack>
                <Stack direction='row' spacing={1}>
                    <Stack>
                        <Typography>Controller Rating:</Typography>
                        <Typography>Time Online:</Typography>
                    </Stack>
                    <Stack>
                        <Typography></Typography>
                        <Typography></Typography>
                    </Stack>
                </Stack>
            </Stack>
            <TextField variant='outlined' multiline fullWidth sx={{ mt: '15px', '& .MuiInputBase-inputMultiline': { whiteSpace: 'pre', overflowX: 'auto' } }} label='Information' value={info} />
        </InfoBox>
    );
}
export default ControllerCard;
