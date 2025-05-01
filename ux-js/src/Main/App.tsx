import { useState, useEffect, useRef, ReactNode, createContext, useContext } from 'react';
import { AppBar, Box, createTheme, CSSObject, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MapIcon from '@mui/icons-material/MapOutlined';
import DesktopIcon from '@mui/icons-material/DesktopWindowsOutlined';
import FlightIcon from '@mui/icons-material/Flight';
import 'ol/ol.css';
import SystemInfoBox from './SystemInfoBox';
import FlightInfoBox from './FlightInfoBox';

const MainDrawerContext = createContext(true);

function MainDrawer(props: { children: ReactNode, open: boolean }) {
	const drawer = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState('auto');
	const firstRender = useRef(true);

	useEffect(() => {
		firstRender.current = false;
		setWidth(`${drawer.current!.firstElementChild!.getBoundingClientRect().width}px`);
	}, []);

	let open = props.open;
	if (firstRender.current) {
		open = true;
	}
	const theme = createTheme();

	let style: CSSObject;
	if (open) {
		style = {
			transition: theme.transitions.create('width', {
				easing: theme.transitions.easing.easeOut,
				duration: theme.transitions.duration.enteringScreen,
			}),
			width: width,
			whiteSpace: 'nowrap',
			overflowX: 'hidden',
		};
	} else {
		style = {
			transition: theme.transitions.create('width', {
				easing: theme.transitions.easing.sharp,
				duration: theme.transitions.duration.leavingScreen,
			}),
			width: theme.spacing(7),
			whiteSpace: 'nowrap',
			overflowX: 'hidden',
		};
	}
	style = {
		height: '100%',
		...style,
		'& .MuiDrawer-paper': style,
	};

	return (
		<Drawer ref={drawer} variant='permanent' sx={style} open={true}>
			<Box sx={theme.mixins.toolbar} />
			<MainDrawerContext value={open} >
				{props.children}
			</MainDrawerContext>
		</Drawer>
	);
}

function MainListIcon(props: { children: ReactNode }) {
	return <ListItemIcon sx={{ minWidth: '40px' }}>{props.children}</ListItemIcon>;
}

function MainListText(props: { primary: ReactNode }) {
	const drawerOpen = useContext(MainDrawerContext);
	return <ListItemText primary={props.primary} sx={{ opacity: drawerOpen ? 1 : 0 }} />;
}

function App() {
	const [open, setOpen] = useState(false);
	const mapNode = useRef<HTMLDivElement>(null);
	const [mapVisible, setMapVisible] = useState(true);
	const [systemVisible, setSystemVisible] = useState(false);
	const [flightVisible, setFlightVisible] = useState(false);
	
	useEffect(() => {
		map.setParent(mapNode.current!);
		hostState.notifyAppReady();
	}, []);

	const switchDrawer = () => {
		setOpen(!open);
	};
	const theme = createTheme();
	
	return (
		<>
			<AppBar sx={{ zIndex: theme.zIndex.drawer + 1 }}>
				<Toolbar>
					<IconButton size='large' edge='start' onClick={switchDrawer}>
						<MenuIcon />
					</IconButton>
				</Toolbar>
			</AppBar>
			<Box sx={theme.mixins.toolbar} />

			<Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'row' }}>
				<MainDrawer open={open}>
					<List>
						<ListItem key='flight_status' disablePadding>
							<ListItemButton selected={flightVisible} onClick={() => { setFlightVisible(!flightVisible); }}>
								<MainListIcon><FlightIcon /></MainListIcon>
								<MainListText primary='Flight Status' />
							</ListItemButton>
						</ListItem>
						<ListItem key='system_status' disablePadding>
							<ListItemButton selected={systemVisible} onClick={() => { setSystemVisible(!systemVisible); }}>
								<MainListIcon><DesktopIcon /></MainListIcon>
								<MainListText primary='System Status' />
							</ListItemButton>
						</ListItem>
					</List>
					<List sx={{ position: 'absolute', bottom: '0px', right: '0px', left: '0px' }}>
						<ListItem key='navigate_dev' disablePadding>
							<ListItemButton disabled={ window.location.href === 'http://localhost:5173/' } onClick={() => { window.location.href = 'http://localhost:5173/'; }}>
								<MainListIcon><MapIcon color='info' /></MainListIcon>
								<MainListText primary='Dev Map' />
							</ListItemButton>
						</ListItem>
						<ListItem key='radar_map' disablePadding>
							<ListItemButton selected={!mapVisible} onClick={() => { setMapVisible(!mapVisible); }}>
								<MainListIcon><MapIcon color='error' /></MainListIcon>
								<MainListText primary='Radar Map' />
							</ListItemButton>
						</ListItem>
					</List>
				</MainDrawer>
				
				<Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
					<Box ref={mapNode} sx={{ flex: '1 1 auto', width: '100%', visibility: mapVisible ? 'visible' : 'hidden' }} />

					<Box sx={{ flex: '1 1 auto', position: 'absolute', display: 'flex', flexDirection: 'column' }} >
						<FlightInfoBox open={flightVisible} />
						<SystemInfoBox open={systemVisible} />
					</Box>

				</Box>
			</Box>
		</>
	);
}

export default App;

/*
TODO:
- zoom to cover area of interest (needs TESTing, looks fine)
- details when airplane is selected
- position predictor

- Find the way to disable map completely - is it still interactable? test with point clicks; also it may download tiles if getting moved by script
- settings: vatsim id+refresh frequency, callsign override, auto server on/off, hide map switch, sim reconnect on/off
- device control panel
*/
