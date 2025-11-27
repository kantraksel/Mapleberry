import { Box, MenuItem, Select, SelectChangeEvent, Stack, Switch, Typography, useTheme } from "@mui/material";
import Header from "./Elements/Header";
import useRev from "../useRev";
import { MapType } from "../../Backend/Map/GlobalMap";

export default function MapView() {
    const [_, addRev] = useRev();

    const theme = useTheme();

    const onSavePosChange = (_event: unknown, checked: boolean) => {
        map.lastPosition = checked;
        addRev();
    };

    const onUseLocalLangChange = (_event: unknown, checked: boolean) => {
        map.useLocale = checked;
        addRev();
    };

    const onSelectEngine = (event: SelectChangeEvent<MapType>) => {
        const value = event.target.value;
        map.mapType = value;
        addRev();
    };

    const onSelectableAreaChange = (_event: unknown, checked: boolean) => {
        controlRadar.enableAreaInteractions = checked;
        addRev();
    };

    const lastPosition = map.lastPosition;
    const mapEngine = map.mapType;
    const useLocalLang = map.useLocale;
    const selectableArea = controlRadar.enableAreaInteractions;

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>Map Canvas</Header>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Map Engine</Typography>
                    <Select id='select-map-engine' value={mapEngine} onChange={onSelectEngine} MenuProps={{ sx: {zIndex: theme.zIndex.drawer + 300} }}>
                        <MenuItem value={MapType.OsmRaster}>OSM Low Quality</MenuItem>
                        <MenuItem value={MapType.OsmVector}>OSM High Quality</MenuItem>
                    </Select>
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Use Local Language on Map</Typography>
                    <Switch checked={useLocalLang} onChange={onUseLocalLangChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Selectable Approach/Center Area</Typography>
                    <Switch checked={selectableArea} onChange={onSelectableAreaChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Save Map Position</Typography>
                    <Switch checked={lastPosition} onChange={onSavePosChange} />
                </Box>
            </Stack>
        </Stack>
    );
}
