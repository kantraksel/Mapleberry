import { useEffect } from 'react';
import { Stack, Tooltip } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import LanguageIcon from '@mui/icons-material/Language';
import { SimulatorStatus } from '../Backend/HostApp/HostState';
import { NetworkStatus } from '../Backend/NetworkUplink/Source/VATSIM';
import useRev from './useRev';

function SystemInfoBar() {
    const [rev, addRev] = useRev();

    useEffect(() => {
        hostState.statusEvent.add(addRev);
        vatsim.StatusUpdate.add(addRev);

        return () => {
            hostState.statusEvent.delete(addRev);
            vatsim.StatusUpdate.delete(addRev);
        }
    }, [rev]);

    const disabled = !hostBridge.open;
    const status = hostState.getHostStatus();
    const netStatus = vatsim.status;

    return (
        <Stack direction='row-reverse' spacing={1.5}>
            <SimulatorStatusElement status={status.simStatus} disabled={disabled} />
            <NetworkStatusElement status={netStatus} disabled={disabled} />
        </Stack>
    );
}

const iconSize = { width: '1.8rem', height: '1.8rem', transition: 'color 0.2s' };

function SimulatorStatusElement(props: { status: SimulatorStatus, disabled: boolean }) {
    let icon;
    let label;

    switch (props.status) {
        case SimulatorStatus.Disconnected: {
            const color = props.disabled ? 'disabled' : 'error';
            icon = <WifiTetheringIcon color={color} sx={ iconSize } />;
            label = 'Simulator Offline';
            break;
        }
        case SimulatorStatus.Connected: {
            icon = <WifiTetheringIcon color='success' sx={ iconSize } />;
            label = hostState.getHostStatus().simName ?? 'Simulator';
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
