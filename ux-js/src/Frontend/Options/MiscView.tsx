import { Box, Stack, Switch, TextField, Typography } from "@mui/material";
import Header from "./Elements/Header";
import useRev from "../useRev";

export default function MiscView() {
    const [_, addRev] = useRev();

    const onCallsignChange = (event: unknown) => {
        const e = event as { target: {value: string} };
        const value = e.target.value;

        tracker.customCallsign = value;
        addRev();
    };

    const onShowAtisChange = (_event: unknown, checked: boolean) => {
        cards.showAtisInFacilityView = checked;
        addRev();
    };

    const onMapScalingChange = (_event: unknown, checked: boolean) => {
        radar.animator.enableMapScaling = checked;
        addRev();
    };

    const onInterpolationChange = (_event: unknown, checked: boolean) => {
        radar.animator.enableInterpolation = checked;
        addRev();
    };

    const onNetCallsignChange = (_event: unknown, checked: boolean) => {
        tracker.useNetCallsign = checked;
        addRev();
    };

    const userCallsign = tracker.customCallsign;
    const showAtis = cards.showAtisInFacilityView;
    const mapScaling = radar.animator.enableMapScaling;
    const interpolation = radar.animator.enableInterpolation;
    const netCallsign = tracker.useNetCallsign;

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>Miscellaneous</Header>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Local Plane Callsign</Typography>
                    <TextField variant='outlined' size='small' defaultValue={userCallsign} placeholder='Use Simulator Callsign' onBlur={onCallsignChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Use Your Network Callsign Instead</Typography>
                    <Switch checked={netCallsign} onChange={onNetCallsignChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Local Plane Feed Interpolation</Typography>
                    <Switch checked={interpolation} onChange={onInterpolationChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Scale Map with Selected Plane</Typography>
                    <Switch checked={mapScaling} onChange={onMapScalingChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Show ATIS in Airport's Controller List</Typography>
                    <Switch checked={showAtis} onChange={onShowAtisChange} />
                </Box>
            </Stack>
        </Stack>
    );
}
