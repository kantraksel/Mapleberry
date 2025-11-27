import { Box, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import MapView from "./MapView";
import AppView from "./AppView";
import AboutView from "./AboutView";
import DevToolsView from "./DevToolsView";
import NetworkView from "./NetworkView";
import MiscView from "./MiscView";

export type View = 'map' | 'network' | 'app' | 'about' | 'dev_preview' | 'misc';

interface ViewInfo {
    name: View;
    display: string;
}

export function ViewList(props: { view: View, onSelect: (item: View) => void }) {
    const views: ViewInfo[] = [
        { name: 'map', display: 'Map Canvas' },
        { name: 'network', display: 'Network Uplink' },
        { name: 'app', display: 'Local Host App' },
        { name: 'misc', display: 'Miscellaneous' },
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

export default function ViewCanvas(props: { view: View }) {
    if (props.view === 'map') {
        return <MapView />;
    } else if (props.view === 'app') {
        return <AppView />;
    } else if (props.view === 'about') {
        return <AboutView />;
    } else if (props.view === 'dev_preview') {
        return <DevToolsView />;
    } else if (props.view === 'network') {
        return <NetworkView />;
    } else if (props.view === 'misc') {
        return <MiscView />;
    }
}
