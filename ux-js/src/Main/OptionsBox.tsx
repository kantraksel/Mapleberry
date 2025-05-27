import { ReactNode, useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, Divider, Link, List, ListItem, ListItemButton, ListItemText, Stack, Switch, TextField, Typography } from '@mui/material';
import VATSIM from '../Map/VATSIM';

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

    return (
        <Stack flex='1 1' spacing={3}>
            <Stack flex='1 1' spacing={1}>
                <Header>Radar</Header>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Callsign</Typography>
                    <TextField variant='outlined' size='small' defaultValue={userCallsign} placeholder='Use Simulator Callsign' onBlur={onCallsignChange} />
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
    return (
        <Stack flex='1 1' spacing={2}>
            <Header>Host App</Header>
            <Stack flex='1 1' spacing={1}>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Reconnect to Simulator</Typography>
                    <Switch disabled />
                </Box>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography>Autostart Device Server</Typography>
                    <Switch disabled />
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
        map.setOptionHook(setMapVisible);
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
        <Box sx={{ position: 'fixed', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <Box
                border='3px solid #333333'
                borderRadius='5px'
                bgcolor='#333333'
                width={props.width}
                height={props.height}
                marginTop='15px'
                marginLeft='15px'
                marginRight='15px'
                display='flex'
                flexDirection='column'
                alignItems='stretch'
                padding='5px'
                sx={{pointerEvents: 'auto'}}
                >
                {props.children}
            </Box>
        </Box>
    );
}

function OptionsBox(props: { open: boolean }) {
    const [state, setState] = useState<View>('map');

    if (!props.open) {
		return <></>;
	}
    return (
        <InfoBox width={600} height={400}>
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
