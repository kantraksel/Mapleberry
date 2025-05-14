import { useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, createTheme, Divider, Typography } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import WifiTetheringOffIcon from '@mui/icons-material/WifiTetheringOff';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled';
import { ServerStatus, SimulatorStatus, StatusCmd } from '../Host/HostState';
import InfoBox from './InfoBox';
import Comment from './Comment';

function SystemInfoBox(props: { open: boolean }) {
	const [status, setStatus] = useState(hostState.getHostStatus());

	useEffect(() => {
		hostState.statusEvent.add(setStatus);

		return () => {
			hostState.statusEvent.delete(setStatus);
		}
	}, []);

	if (!props.open) {
		return <></>;
	}

	const simName = hostState.getSimName();

	let button1;
	if (status.simStatus == SimulatorStatus.Disconnected) {
		const onClick = () => {
			hostState.sendStatusCmd(StatusCmd.ConnectSim);
		};
		button1 = <Button variant='outlined' color='primary' onClick={onClick}>Connect Sim</Button>;
	}
	else {
		const onClick = () => {
			hostState.sendStatusCmd(StatusCmd.DisconnectSim);
		};
		button1 = <Button variant='outlined' color='error' onClick={onClick}>Disconnect Sim</Button>;
	}

	let button2;
	if (status.srvStatus == ServerStatus.Stopped) {
		const onClick = () => {
			hostState.sendStatusCmd(StatusCmd.StartServer);
		};
		button2 = <Button variant='outlined' color='primary' sx={{ ml: '5px' }} onClick={onClick}>Start Server</Button>;
	}
	else {
		const onClick = () => {
			hostState.sendStatusCmd(StatusCmd.StopServer);
		};
		button2 = <Button variant='outlined' color='error' sx={{ ml: '5px' }} onClick={onClick}>Stop Server</Button>;
	}

	return (
		<InfoBox width={330}>
			<Typography variant='h4' sx={{ m: '2px' }}>System</Typography>
			<Divider flexItem />
			<Box display='flex' flexDirection='column' sx={{ m: '5px' }}>
				<SimulatorStatusElement status={status.simStatus} simName={simName} />
				<ServerStatusElement status={status.srvStatus} />
				<Comment txt="Not impl."><TrackerStatusElement status={SimulatorStatus.Disconnected} /></Comment>
			</Box>
			<Divider flexItem />

			<Box display='flex' flexDirection='row' sx={{ m: '10px' }}>
				{button1}
				{button2}
			</Box>

			<Comment txt="Not impl.">
			<Box display='flex' flexDirection='row' alignItems='center' sx={{ mt: '-5px', mb: '10px' }}>
				<Typography>Flight Tracker</Typography>
				<ButtonGroup variant='outlined' sx={{ ml: '10px' }}>
					<Button color='success' disabled>On</Button>
					<Button color='error' disabled>Off</Button>
				</ButtonGroup>
			</Box>
			</Comment>
		</InfoBox>
	);
}

function SimulatorStatusElement(props: { status: SimulatorStatus, simName?: string }) {
	let icon;
	let label;

	const theme = createTheme();
	const fontSize = theme.typography.h5.fontSize;
	const iconSize = { width: fontSize, height: fontSize };

	switch (props.status) {
		case SimulatorStatus.Disconnected: {
			icon = <WifiTetheringOffIcon color='error' sx={ iconSize } />;
			label = 'Simulator Offline';
			break;
		}
		case SimulatorStatus.Connected: {
			icon = <WifiTetheringIcon color='success' sx={ iconSize } />;
			label = props.simName || 'Simulator';
			break;
		}
		default: {
			icon = <ErrorIcon color='error' sx={ iconSize } />;
			label = 'Unknown Simulator Status';
			break;
		}
	}

	return (
		<Box display='flex' flexDirection='row' alignItems='center' sx={{ m: '2px' }}>
			{icon}
			<Typography sx={{ marginLeft: '5px' }}>
				{label}
			</Typography>
		</Box>
	);
}

function ServerStatusElement(props: { status: ServerStatus }) {
	let icon;
	let label;

	const theme = createTheme();
	const fontSize = theme.typography.h5.fontSize;
	const iconSize = { width: fontSize, height: fontSize };

	switch (props.status) {
		case ServerStatus.Stopped: {
			icon = <WifiOffIcon color='error' sx={ iconSize } />;
			label = 'Device Server Inactive';
			break;
		}
		case ServerStatus.Listening: {
			icon = <WifiIcon color='warning' sx={ iconSize } />;
			label = 'Listening for Devices';
			break;
		}
		case ServerStatus.Connected: {
			icon = <WifiIcon color='success' sx={ iconSize } />;
			label = 'Device Connected';
			break;
		}
		default: {
			icon = <ErrorIcon color='error' sx={ iconSize } />;
			label = 'Unknown Device Server Status';
			break;
		}
	}

	return (
		<Box display='flex' flexDirection='row' alignItems='center' sx={{ m: '2px' }}>
			{icon}
			<Typography sx={{ ml: '5px' }}>
				{label}
			</Typography>
		</Box>
	);
}

function TrackerStatusElement(props: { status: SimulatorStatus }) {
	let icon;
	let label;

	const theme = createTheme();
	const fontSize = theme.typography.h5.fontSize;
	const iconSize = { width: fontSize, height: fontSize };

	switch (props.status) {
		case SimulatorStatus.Disconnected: {
			icon = <SyncDisabledIcon color='error' sx={ iconSize } />;
			label = 'Flight Tracker Offline';
			break;
		}
		case SimulatorStatus.Connected: {
			icon = <SyncIcon color='success' sx={ iconSize } />;
			label = 'Flight Tracker Online';
			break;
		}
		default: {
			icon = <ErrorIcon color='error' sx={ iconSize } />;
			label = 'Unknown Tracker Status';
			break;
		}
	}

	return (
		<Box display='flex' flexDirection='row' alignItems='center' sx={{ m: '2px' }}>
			{icon}
			<Typography sx={{ marginLeft: '5px' }}>
				{label}
			</Typography>
		</Box>
	);
}

export default SystemInfoBox;
