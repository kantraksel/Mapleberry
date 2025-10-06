import { useEffect, useState } from 'react';
import { Stack, Tooltip } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import WifiTetheringOffIcon from '@mui/icons-material/WifiTetheringOff';
import LanguageIcon from '@mui/icons-material/Language';
import { SimulatorStatus } from '../Host/HostState';
import { NetworkStatus } from '../Network/VATSIM';

function SystemInfoBar() {
    const [status, setStatus] = useState(hostState.getHostStatus());
    const [netStatus, setNetStatus] = useState(NetworkStatus.Disabled);

    useEffect(() => {
        hostState.statusEvent.add(setStatus);
        vatsim.StatusUpdate.add(setNetStatus);

        return () => {
            hostState.statusEvent.delete(setStatus);
            vatsim.StatusUpdate.delete(setNetStatus);
        }
    }, []);

    const disabled = !hostBridge.enabled;

    return (
        <Stack direction='row-reverse' spacing={1.5}>
            <SimulatorStatusElement status={status.simStatus} disabled={disabled} />
            <NetworkStatusElement status={netStatus} disabled={disabled} />
        </Stack>
    );
}

const iconSize = { width: '1.8rem', height: '1.8rem' };

function SimulatorStatusElement(props: { status: SimulatorStatus, disabled: boolean }) {
    let icon;
    let label;

    switch (props.status) {
        case SimulatorStatus.Disconnected: {
            const color = props.disabled ? 'disabled' : 'error';
            icon = <WifiTetheringOffIcon color={color} sx={ iconSize } />;
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

function NetworkStatusElement(props: { status: NetworkStatus, disabled: boolean }) {
    let icon;
    let label;

    switch (props.status) {
        case NetworkStatus.Disabled: {
            const color = props.disabled ? 'disabled' : 'error';
            icon = <LanguageIcon color={color} sx={ iconSize } />;
            label = 'Network Disabled';
            break;
        }
        case NetworkStatus.Updating: {
            icon = <LanguageIcon color='warning' sx={ iconSize } />;
            label = 'Refreshing Network';
            break;
        }
        case NetworkStatus.UpToDate: {
            icon = <LanguageIcon color='success' sx={ iconSize } />;
            label = 'Network Active';
            break;
        }
        default: {
            icon = <ErrorIcon color='error' sx={ iconSize } />;
            label = 'Unknown Network Status';
            break;
        }
    }

    return <Tooltip title={label}>{icon}</Tooltip>;
}

export default SystemInfoBar;
