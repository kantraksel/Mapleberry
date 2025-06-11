import { Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { ReactNode } from 'react';
import Comment from './Comment';

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

function PilotCard(props: { open: boolean }) {
    if (!props.open) {
        return <></>;
    }

    return (
        <InfoBox width={'500px'} height={'auto'}>
            <Typography variant='h4'>_Callsign_</Typography>
            <Stack useFlexGap direction='row' spacing={3} sx={{ mt: '5px', ml: '7px', mr: '7px', width: 'stretch' }}>
                <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Stack>
                        <Typography>Name:</Typography>
                        <Typography>Aircraft:</Typography>
                    </Stack>
                    <Stack>
                        <Typography></Typography>
                        <Typography></Typography>
                    </Stack>
                </Stack>
                <Stack useFlexGap direction='row' spacing={1} sx={{ flex: '1 1 auto' }}>
                    <Stack>
                        <Typography>Pilot Rating:</Typography>
                        <Typography>Time Online:</Typography>
                    </Stack>
                    <Stack>
                        <Comment txt='Use military rating if present' />
                        <Typography></Typography>
                        <Typography></Typography>
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
                    <Typography></Typography>
                    <Typography></Typography>
                    <Typography></Typography>
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
                            <Typography></Typography>
                            <Typography></Typography>
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
                            <Typography></Typography>
                            <Typography></Typography>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
            <TextField variant='outlined' fullWidth sx={{ mt: '15px', '& .MuiInputBase-inputMultiline': { whiteSpace: 'pre', overflowX: 'auto' } }} label='Route' value='' />
            <TextField variant='outlined' fullWidth sx={{ mt: '15px', '& .MuiInputBase-inputMultiline': { whiteSpace: 'pre', overflowX: 'auto' } }} label='Remarks' value='' />
        </InfoBox>
    );
}
export default PilotCard;
