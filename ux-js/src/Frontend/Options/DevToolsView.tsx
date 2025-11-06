import { Button, ButtonGroup, Divider, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import Header from "./Elements/Header";

const devServer = 'http://localhost:5173/';

export default function DevToolsView() {
    const [playbackActive, setPlaybackActive] = useState(replay.active);
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
                    <Button color='primary' disabled={playbackActive} onClick={() => { replay.playbackDefault(setPlaybackActive); }}>Play</Button>
                    <Button color='primary' disabled={playbackActive} onClick={() => { replay.record(setPlaybackActive); }}>Record</Button>
                    <Button color='error' disabled={!playbackActive} onClick={() => { replay.abort(); }}>Stop</Button>
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
