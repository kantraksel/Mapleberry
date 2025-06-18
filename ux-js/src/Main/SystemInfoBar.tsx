import { useEffect, useState } from 'react';
import { Stack, Tooltip } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import WifiTetheringOffIcon from '@mui/icons-material/WifiTetheringOff';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import { ServerStatus, SimulatorStatus } from '../Host/HostState';

function SystemInfoBar() {
    const [status, setStatus] = useState(hostState.getHostStatus());

    useEffect(() => {
        hostState.statusEvent.add(setStatus);

        return () => {
            hostState.statusEvent.delete(setStatus);
        }
    }, []);

    return (
        <Stack direction='row-reverse' spacing={1.5}>
            <SimulatorStatusElement status={status.simStatus} />
            <ServerStatusElement status={status.srvStatus} />
        </Stack>
    );
}

const iconSize = { width: '1.8rem', height: '1.8rem' };

function SimulatorStatusElement(props: { status: SimulatorStatus }) {
    let icon;
    let label;

    switch (props.status) {
        case SimulatorStatus.Disconnected: {
            icon = <WifiTetheringOffIcon color='error' sx={ iconSize } />;
            label = 'Simulator Offline';
            break;
        }
        case SimulatorStatus.Connected: {
            icon = <WifiTetheringIcon color='success' sx={ iconSize } />;
            label = hostState.getSimName() || 'Simulator';
            break;
        }
        default: {
            icon = <ErrorIcon color='error' sx={ iconSize } />;
            label = 'Unknown Simulator Status';
            break;
        }
    }

    return <Tooltip title={label}>{icon}</Tooltip>;
}

function ServerStatusElement(props: { status: ServerStatus }) {
    let icon;
    let label;

    switch (props.status) {
        case ServerStatus.Stopped: {
            icon = <SettingsRemoteIcon color='error' sx={ iconSize } />;
            label = 'Device Server Inactive';
            break;
        }
        case ServerStatus.Listening: {
            icon = <SettingsRemoteIcon color='warning' sx={ iconSize } />;
            label = 'Listening for Devices';
            break;
        }
        case ServerStatus.Connected: {
            icon = <SettingsRemoteIcon color='success' sx={ iconSize } />;
            label = 'Device Connected';
            break;
        }
        default: {
            icon = <ErrorIcon color='error' sx={ iconSize } />;
            label = 'Unknown Device Server Status';
            break;
        }
    }

    return <Tooltip title={label}>{icon}</Tooltip>;
}

export default SystemInfoBar;
