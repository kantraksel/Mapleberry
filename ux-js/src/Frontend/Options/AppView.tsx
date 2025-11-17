import { useEffect } from "react";
import { SimulatorStatus, StatusCmd } from "../../Backend/HostApp/HostState";
import { Box, Button, ButtonGroup, Stack, Switch, Typography } from "@mui/material";
import Header from "./Elements/Header";
import NumberField from "./Elements/NumberField";
import useRev from "../useRev";

export default function AppView() {
    const [rev, addRev] = useRev();

    useEffect(() => {
        hostState.statusEvent.add(addRev);

        return () => {
            hostState.statusEvent.delete(addRev);
        }
    }, [rev]);

    const onEnableApp = () => {
        hostBridge.enabled = true;
        addRev();
    };

    const onDisableApp = () => {
        hostBridge.enabled = false;
        addRev();
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
        hostState.allowSimComReconnect = checked;
        addRev();
    };

    const appEnabled = hostBridge.enabled;
    const appConnected = hostBridge.open;
    const appReconnectSpan = hostBridge.reconnectSpan;
    const appPort = hostBridge.port;
    const status = hostState.getHostStatus();
    const simConnected = status.simStatus != SimulatorStatus.Disconnected;
    const simcomReconnect = hostState.allowSimComReconnect;

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
