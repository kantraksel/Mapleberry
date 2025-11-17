import { Button, ButtonGroup, Divider, Stack } from "@mui/material";
import { useEffect } from "react";
import Header from "./Elements/Header";
import useRev from "../useRev";

const devServer = 'http://localhost:5173/';

export default function DevToolsView() {
    const [rev, addRev] = useRev();

    useEffect(() => {
        map.visibilityEvent.add(addRev);
        
        return () => {
            map.visibilityEvent.delete(addRev);
        };
    }, [rev]);

    const playbackActive = replay.active;
    const mapVisible = map.visible;

    return (
        <Stack flex='1' alignItems='center' spacing={2}>
            <Stack spacing={1}>
                <Header>Radar Playback</Header>
                <ButtonGroup variant='outlined'>
                    <Button color='primary' disabled={playbackActive} onClick={() => { replay.playbackDefault(addRev); }}>Play</Button>
                    <Button color='primary' disabled={playbackActive} onClick={() => { replay.record(addRev); }}>Record</Button>
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
