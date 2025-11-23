import { Box, MenuItem, Select, SelectChangeEvent, Stack, Switch, TextField, Typography, useTheme } from "@mui/material";
import Header from "./Elements/Header";
import useRev from "../useRev";
import { MapType } from "../../Backend/Map/GlobalMap";
import { useState } from "react";

export default function MapView() {
    const [_, addRev] = useRev();
    const [useLocalLang, setUseLocalLang] = useState(map.useLocale);
    const [selectedEngine, setSelectedEngine] = useState(map.mapType);

    const theme = useTheme();

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

    const onInterpolationChange = (_event: unknown, checked: boolean) => {
        radar.animator.enableInterpolation = checked;
        addRev();
    };

    const onSelectableAreaChange = (_event: unknown, checked: boolean) => {
        controlRadar.enableAreaInteractions = checked;
        addRev();
    };

    const onShowAtisChange = (_event: unknown, checked: boolean) => {
        cards.showAtisInFacilityView = checked;
        addRev();
    };

    const onUseLocalLangChange = (_event: unknown, checked: boolean) => {
        map.useLocale = checked;
        setUseLocalLang(checked);
    };

    const onSelectEngine = (event: SelectChangeEvent<MapType>) => {
        const value = event.target.value;
        map.mapType = value;
        setSelectedEngine(value);
    };

    const lastPosition = map.lastPosition;
    const mapScaling = radar.animator.enableMapScaling;
    const userCallsign = tracker.customCallsign;
    const interpolation = radar.animator.enableInterpolation;
    const selectableArea = controlRadar.enableAreaInteractions;
    const showAtis = cards.showAtisInFacilityView;

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>Local Radar</Header>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Your Callsign</Typography>
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
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Local plane interpolation</Typography>
                    <Switch checked={interpolation} onChange={onInterpolationChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Selectable approach/center area</Typography>
                    <Switch checked={selectableArea} onChange={onSelectableAreaChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Show ATIS in airport's controller list</Typography>
                    <Switch checked={showAtis} onChange={onShowAtisChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Use local language on map</Typography>
                    <Switch checked={useLocalLang} onChange={onUseLocalLangChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Map engine</Typography>
                    <Select id='select-map-engine' value={selectedEngine} onChange={onSelectEngine} MenuProps={{ sx: {zIndex: theme.zIndex.drawer + 300} }}>
                        <MenuItem value={MapType.OsmRaster}>OSM Low Quality</MenuItem>
                        <MenuItem value={MapType.OsmVector}>OSM High Quality</MenuItem>
                    </Select>
                </Box>
            </Stack>
        </Stack>
    );
}
