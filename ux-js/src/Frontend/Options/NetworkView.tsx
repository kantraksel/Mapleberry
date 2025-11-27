import { Box, Stack, Switch, Typography } from "@mui/material";
import Header from "./Elements/Header";
import NumberField from "./Elements/NumberField";
import VATSIM from "../../Backend/NetworkUplink/Source/VATSIM";
import useRev from "../useRev";

export default function NetworkView() {
    const [_, addRev] = useRev();

    const onOnlineChange = (_event: unknown, checked: boolean) => {
        vatsim.enabled = checked;
        addRev();
    };

    const onRefreshRateChange = (value: number | undefined) => {
        vatsim.refreshRate = value ?? -1;
        addRev();
    };

    const onIdChange = (value: number | undefined) => {
        trafficRadar.userId = value;
        addRev();
    };

    const vatsimOnline = vatsim.enabled;
    const refreshRate = vatsim.refreshRate;
    const uid = trafficRadar.userId;

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>Network Uplink</Header>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Online Mode</Typography>
                    <Switch checked={vatsimOnline} onChange={onOnlineChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Refresh Rate</Typography>
                    <NumberField defaultValue={refreshRate} placeholder={`${VATSIM.defaultRefreshRate}`} onBlur={onRefreshRateChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Local User ID</Typography>
                    <NumberField placeholder='Your CID' defaultValue={uid} onBlur={onIdChange} />
                </Box>
            </Stack>
        </Stack>
    );
}
