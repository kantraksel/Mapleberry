import { useEffect, useState } from "react";
import { SimulatorStatus, StatusCmd } from "../../Backend/HostApp/HostState";
import { Box, Button, ButtonGroup, Stack, Switch, Typography } from "@mui/material";
import Header from "./Elements/Header";
import NumberField from "./Elements/NumberField";

export default function AppView() {
    const [rev, setRev] = useState(0);
    const [status, setStatus] = useState(hostState.getHostStatus());
    const [simcomReconnect, setSimcomReconnect] = useState(hostState.getAllowSimComReconnect());

    const changeRev = () => setRev(rev + 1);

    useEffect(() => {
        hostState.statusEvent.add(setStatus);

        return () => {
            hostState.statusEvent.delete(setStatus);
        }
    }, []);

    const onEnableApp = () => {
        hostBridge.enabled = true;
        changeRev();
    };

    const onDisableApp = () => {
        hostBridge.enabled = false;
        changeRev();
    };

    const onAppPortChange = (value: number | undefined) => {
        if (value === undefined || !hostBridge.isPortValid(value)) {
            return;
        }
        hostBridge.port = value;
    };

    const onReconnectAppSpanChange = (value: number | undefined) => {
        hostBridge.reconnectSpan = value ?? -1;
    };

    const onConnectSim = () => {
        hostState.sendStatusCmd(StatusCmd.ConnectSim);
    };

    const onDisconnectSim = () => {
        hostState.sendStatusCmd(StatusCmd.DisconnectSim);
    };

    const onSimcomReconnectChange = (_event: unknown, checked: boolean) => {
        hostState.setAllowSimComReconnect(checked);
        setSimcomReconnect(checked);
    };

    const appEnabled = hostBridge.enabled;
    const appConnected = hostBridge.open;
    const appReconnectSpan = hostBridge.reconnectSpan;
    const appPort = hostBridge.port;
    const simConnected = status.simStatus != SimulatorStatus.Disconnected;

    return (
        <Stack flex='1 1' spacing={2}>
            <Header>Host App</Header>
            <Stack flex='1 1' spacing={1}>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Host App Connection</Typography>
                    <ButtonGroup variant='outlined'>
                        <Button color='primary' disabled={appEnabled} onClick={onEnableApp}>Enable</Button>
                        <Button color='error' disabled={!appEnabled} onClick={onDisableApp}>Disable</Button>
                    </ButtonGroup>
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Connection Port</Typography>
                    <NumberField defaultValue={appPort} placeholder={`${appPort}`} onBlur={onAppPortChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Reconnect Attempt Span</Typography>
                    <NumberField defaultValue={appReconnectSpan} placeholder={`${appReconnectSpan}`} onBlur={onReconnectAppSpanChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Simulator Comms</Typography>
                    <ButtonGroup variant='outlined' disabled={!appConnected}>
                        <Button color='primary' disabled={simConnected} onClick={onConnectSim}>Connect</Button>
                        <Button color='error' disabled={!simConnected} onClick={onDisconnectSim}>Disconnect</Button>
                    </ButtonGroup>
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Reestablish Simulator Comms</Typography>
                    <Switch checked={simcomReconnect} onChange={onSimcomReconnectChange} />
                </Box>
            </Stack>
        </Stack>
    );
}
