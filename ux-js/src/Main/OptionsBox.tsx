import { ReactNode, useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, Divider, IconButton, Link, List, ListItem, ListItemButton, ListItemText, Stack, Switch, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VATSIM from '../Network/VATSIM';
import { ServerStatus, SimulatorStatus, StatusCmd } from '../Host/HostState';

type View = 'map' | 'app' | 'about' | 'dev_preview';

interface ViewInfo {
    name: View;
    display: string;
}

function ViewList(props: { view: View, onSelect: (item: View) => void }) {
    const views: ViewInfo[] = [
        { name: 'map', display: 'Web Map' },
        { name: 'app', display: 'Host App' },
        { name: 'about', display: 'About App' },
        { name: 'dev_preview', display: 'Dev Preview' },
    ];

    const viewList = views.map(view => (
        <ListItem key={view.name} disablePadding>
            <ListItemButton selected={props.view === view.name} onClick={() => {
                props.onSelect(view.name);
            }}>
                <ListItemText primary={view.display} />
            </ListItemButton>
        </ListItem>
    ));

    return (
        <Box minWidth='125px'>
            <List>
                {viewList}
            </List>
        </Box>
    );
}

function Header(props: { children: string }) {
    return <Box sx={{ display: 'block', fontSize: '1.3em', fontWeight: 'bold', textAlign: 'center' }}>{props.children}</Box>;
}

function NumberField(props: { label?: string, disabled?: boolean, defaultValue?: number, placeholder?: string, onBlur?: (value: number | undefined) => void }) {
    const [valid, setValid] = useState(true);

    const onChange = (event: unknown) => {
        const e = event as { target: {value: string} };
        const value = e.target.value;

        if (value.length == 0) {
            setValid(true);
            return;
        }
        const n = parseInt(value);
        setValid(n.toString() === value);
    };

    const onBlur = (event: unknown) => {
        if (!props.onBlur) {
            return;
        }
        const e = event as { target: {value: string} };
        const value = e.target.value;

        let n = parseInt(value);
        if (n.toString() !== value) {
            props.onBlur(undefined);
        } else {
            props.onBlur(n);
        }
    };

    return <TextField variant='outlined' size='small' disabled={props.disabled} label={props.label} defaultValue={props.defaultValue} placeholder={props.placeholder} error={!valid} onChange={onChange} onBlur={onBlur} />;
}

function MapView() {
    const [vatsimOnline, setVatsimOnline] = useState(vatsim.enabled);
    const [refreshRate, setRefreshRate] = useState(vatsim.refreshRate);
    const [userCallsign, setUserCallsign] = useState(tracker.customCallsign);
    const [mapScaling, setMapScaling] = useState(radar.animator.enableMapScaling);
    const [savePosition, setSavePosition] = useState(map.saveLastPosition);

    const onCallsignChange = (event: unknown) => {
        const e = event as { target: {value: string} };
        const value = e.target.value;

        tracker.customCallsign = value;
        setUserCallsign(value);
    };

    const onOnlineChange = (_event: unknown, checked: boolean) => {
        vatsim.enabled = checked;
        checked = vatsim.enabled;
        setVatsimOnline(checked);

        if (checked) {
            vatsim.start();
        } else {
            vatsim.stop();
        }
    };

    const onRefreshRateChange = (value: number | undefined) => {
        vatsim.refreshRate = value ?? -1;
        setRefreshRate(vatsim.refreshRate);
    };

    const onMapScalingChange = (_event: unknown, checked: boolean) => {
        radar.animator.enableMapScaling = checked;
        setMapScaling(checked);
    };

    const onSavePosChange = (_event: unknown, checked: boolean) => {
        map.saveLastPosition = checked;
        setSavePosition(checked);
    };

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
                    <Switch checked={savePosition} onChange={onSavePosChange} />
                </Box>
            </Stack>
            <Stack flex='1 1' spacing={1}>
                <Header>VATSIM</Header>
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
                    <NumberField label='CID' disabled />
                </Box>
            </Stack>
        </Stack>
    );
}

function AppView() {
    const [rev, setRev] = useState(0);
    const [status, setStatus] = useState(hostState.getHostStatus());
    const [serverAutostart, setServerAutostart] = useState(hostState.launchServerOnStart);
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

    const onStartServer = () => {
        hostState.sendStatusCmd(StatusCmd.StartServer);
    };

    const onStopServer = () => {
        hostState.sendStatusCmd(StatusCmd.StopServer);
    };

    const onServerAutostartChange = (_event: unknown, checked: boolean) => {
        hostState.launchServerOnStart = checked;
        setServerAutostart(checked);
    };

    const onSimcomReconnectChange = (_event: unknown, checked: boolean) => {
        hostState.setAllowSimComReconnect(checked);
        setSimcomReconnect(checked);
    };

    const appEnabled = hostBridge.enabled;
    const appConnected = hostBridge.open;
    const appReconnectSpan = hostBridge.reconnectSpan;
    const appPort = hostBridge.port;
    const serverStarted = status.srvStatus != ServerStatus.Stopped;
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
                    <Typography>Device Server</Typography>
                    <ButtonGroup variant='outlined' disabled={!appConnected}>
                        <Button color='primary' disabled={serverStarted} onClick={onStartServer}>Start</Button>
                        <Button color='error' disabled={!serverStarted} onClick={onStopServer}>Stop</Button>
                    </ButtonGroup>
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Reestablish Simulator Comms</Typography>
                    <Switch checked={simcomReconnect} onChange={onSimcomReconnectChange} />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Launch Device Server on Start</Typography>
                    <Switch checked={serverAutostart} onChange={onServerAutostartChange} />
                </Box>
            </Stack>
        </Stack>
    );
}

function AboutView() {
    return (
        <Stack flex='1 1' alignItems='center' spacing={2}>
            <Stack alignItems='center' spacing={1}>
                <Typography variant='h5'>Mapleberry 0.X</Typography>
                <Typography sx={{ fontFamily: 'Helvetica', fontStyle: 'italic' }}>Because paying is a crime</Typography>
                <Typography>(to be updated)</Typography>
            </Stack>
            <Divider flexItem />
            <Stack alignItems='center' spacing={1}>
                <Link target='_blank' href='https://github.com/kantraksel/Mapleberry' underline='hover'>GitHub: kantraksel/Mapleberry</Link>
            </Stack>
        </Stack>
  );
}

function SelectedView(props: { view: View }) {
    if (props.view === 'map') {
        return <MapView />;
    } else if (props.view === 'app') {
        return <AppView />;
    } else if (props.view === 'about') {
        return <AboutView />;
    } else if (props.view === 'dev_preview') {
        return <DevToolsView />;
    }
}

const devServer = 'http://localhost:5173/';

function DevToolsView() {
    const [playbackActive, setPlaybackActive] = useState(hostBridge.playbackActive);
    const [mapVisible, setMapVisible] = useState(map.visible);

    useEffect(() => {
        map.visibilityEvent.add(setMapVisible);
        
        return () => {
            map.visibilityEvent.delete(setMapVisible);
        };
    }, []);

    return (
        <Stack flex='1' alignItems='center' spacing={2}>
            <Stack spacing={1}>
                <Header>Radar Playback</Header>
                <ButtonGroup variant='outlined'>
                    <Button color='primary' disabled={playbackActive} onClick={() => { hostBridge.playbackDefault(setPlaybackActive); }}>Play</Button>
                    <Button color='primary' disabled={playbackActive} onClick={() => { hostBridge.recordPlaylist(setPlaybackActive); }}>Record</Button>
                    <Button color='error' disabled={!playbackActive} onClick={() => { hostBridge.abortPlayback(); }}>Stop</Button>
                </ButtonGroup>
            </Stack>
            <Divider flexItem />
            <Stack spacing={1}>
                <Header>Other</Header>
                <Button variant='outlined' color='info' disabled={ window.location.href === devServer } onClick={() => { window.location.href = devServer; }}>
                    Navigate to Dev Map
                </Button>
                <ButtonGroup variant='outlined'>
                    <Button disabled={mapVisible} onClick={() => { map.visible = true; }}>Show Map</Button>
                    <Button disabled={!mapVisible} onClick={() => { map.visible = false; }}>Hide Map</Button>
                </ButtonGroup>
            </Stack>
        </Stack>
    )
}

function InfoBox(props: { children?: ReactNode, width: number | string, height: number | string }) {
    return (
        <Box sx={{ position: 'fixed', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
            <Box
                position='relative'
                border='3px solid #333333'
                borderRadius='5px'
                bgcolor='#333333'
                width={props.width}
                height={props.height}
                display='flex'
                flexDirection='column'
                alignItems='stretch'
                padding='5px'
                sx={{pointerEvents: 'auto'}}
                boxShadow='0 26px 58px 0 rgba(0, 0, 0, .22), 0 5px 14px 0 rgba(0, 0, 0, .18)'
                >
                {props.children}
            </Box>
        </Box>
    );
}

function OptionsBox(props: { open: boolean, onClose: () => void }) {
    const [state, setState] = useState<View>('map');

    if (!props.open) {
		return <></>;
	}
    return (
        <InfoBox width={600} height={410}>
            <Stack position='absolute' right='5px' direction='row-reverse'>
                <IconButton onClick={props.onClose}><CloseIcon /></IconButton>
            </Stack>
            <Stack flex='1 1' direction='row' alignItems='center' justifyContent='flex-start' spacing={1}>
                <ViewList view={state} onSelect={setState} />
                <Divider orientation='vertical' flexItem />
                <Box flex='1 1' display='flex' alignItems='center' justifyContent='center' padding='10px'>
                    <SelectedView view={state} />
                </Box>
            </Stack>
        </InfoBox>
    );
}

export default OptionsBox;
