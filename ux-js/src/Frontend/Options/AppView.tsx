import { Box, Button, ButtonGroup, Stack, Typography } from "@mui/material";
import Header from "./Elements/Header";
import NumberField from "./Elements/NumberField";
import useRev from "../useRev";

export default function AppView() {
    const [_, addRev] = useRev();

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

    const onEnableSimCom = () => {
        hostState.enableSimCom = true;
        addRev();
    };

    const onDisableSimCom = () => {
        hostState.enableSimCom = false;
        addRev();
    };

    const appEnabled = hostBridge.enabled;
    const appConnected = hostBridge.open;
    const appReconnectSpan = hostBridge.reconnectSpan;
    const appPort = hostBridge.port;
    const simcomEnabled = hostState.enableSimCom;

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
                    <Typography>Simulator Connection</Typography>
                    <ButtonGroup variant='outlined' disabled={!appConnected}>
                        <Button color='primary' disabled={simcomEnabled} onClick={onEnableSimCom}>Enable</Button>
                        <Button color='error' disabled={!simcomEnabled} onClick={onDisableSimCom}>Disable</Button>
                    </ButtonGroup>
                </Box>
            </Stack>
        </Stack>
    );
}
