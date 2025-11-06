import { Box, Stack, Switch, Typography } from "@mui/material";
import { useState } from "react";
import Header from "./Elements/Header";
import NumberField from "./Elements/NumberField";
import VATSIM from "../../Backend/Network/VATSIM";

export default function NetworkView() {
    const [vatsimOnline, setVatsimOnline] = useState(vatsim.enabled);
    const [refreshRate, setRefreshRate] = useState(vatsim.refreshRate);
    const [rev, setRev] = useState(0);

    const onOnlineChange = (_event: unknown, checked: boolean) => {
        vatsim.enabled = checked;
        setVatsimOnline(checked);
    };

    const onRefreshRateChange = (value: number | undefined) => {
        vatsim.refreshRate = value ?? -1;
        setRefreshRate(vatsim.refreshRate);
    };

    const onIdChange = (value: number | undefined) => {
        trafficRadar.userId = value;
        setRev(rev + 1);
    };

    const uid = trafficRadar.userId;

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>VATSIM Network</Header>
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
