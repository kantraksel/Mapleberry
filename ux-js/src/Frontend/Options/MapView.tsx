import { Box, Stack, Switch, TextField, Typography } from "@mui/material";
import Header from "./Elements/Header";
import useRev from "../useRev";

export default function MapView() {
    const [_, addRev] = useRev();

    const onCallsignChange = (event: unknown) => {
        const e = event as { target: {value: string} };
        const value = e.target.value;

        tracker.customCallsign = value;
        addRev();
    };

    const onMapScalingChange = (_event: unknown, checked: boolean) => {
        radar.animator.enableMapScaling = checked;
        addRev();
    };

    const onSavePosChange = (_event: unknown, checked: boolean) => {
        map.lastPosition = checked;
        addRev();
    };

    const lastPosition = map.lastPosition;
    const mapScaling = radar.animator.enableMapScaling;
    const userCallsign = tracker.customCallsign;

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>Radar</Header>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Callsign</Typography>
                    <TextField variant='outlined' size='small' defaultValue={userCallsign} placeholder='Use Simulator Callsign' onBlur={onCallsignChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Scale map with selected plane</Typography>
                    <Switch checked={mapScaling} onChange={onMapScalingChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Save map position</Typography>
                    <Switch checked={lastPosition} onChange={onSavePosChange} />
                </Box>
            </Stack>
        </Stack>
    );
}
