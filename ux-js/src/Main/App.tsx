import { useState, useEffect, useRef, ReactNode, createContext, useContext } from 'react';
import { AppBar, Box, createTheme, CSSObject, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DesktopIcon from '@mui/icons-material/DesktopWindowsOutlined';
import FlightIcon from '@mui/icons-material/Flight';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupsIcon from '@mui/icons-material/Groups';
import CloudIcon from '@mui/icons-material/Cloud';
import 'ol/ol.css';
import SystemInfoBox from './SystemInfoBox';
import FlightInfoBox from './FlightInfoBox';
import OptionsBox from './OptionsBox';
import Scoreboard, { FacilityStationsList } from './Scoreboard';
import ControllerCard from './Cards/ControllerCard';
import PilotCard from './Cards/PilotCard';
import SystemInfoBar from './SystemInfoBar';
import PrefileCard from './Cards/PrefileCard';
import AtisCard from './Cards/AtisCard';
import MetarBox from './MetarBox';

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
	const [mapVisible, setMapVisible] = useState(map.visible);
	const [systemVisible, setSystemVisible] = useState(false);
	const [flightVisible, setFlightVisible] = useState(false);
	const [optionsVisible, setOptionsVisible] = useState(false);
	const [scoreboardVisible, setScoreboardVisible] = useState(false);
	const [metarVisible, setMetarVisible] = useState(false);
	
	useEffect(() => {
		map.setParent(mapNode.current!);
		map.visibilityEvent.add(setMapVisible);
		hostState.notifyAppReady();

		cards.stationsRef = setScoreboardVisible;
		return () => {
			map.visibilityEvent.delete(setMapVisible);
			cards.stationsRef = undefined;
		};
	}, []);

	const switchDrawer = () => {
		setOpen(!open);
	};
	const theme = createTheme();

	let mapStyle;
	if (mapVisible) {
		mapStyle = {
			visibility: 'visible',
			opacity: 1,
			transition: 'opacity 0.25s linear, visibility 0.25s',
		};
	} else {
		mapStyle = {
			visibility: 'hidden',
			opacity: 0,
			transition: 'opacity 0.25s ease, visibility 0.25s',
		};
	}
	
	return (
		<>
			<AppBar sx={{ zIndex: theme.zIndex.drawer + 1 }}>
				<Toolbar>
					<Box sx={{ flexGrow: 1 }}>
						<IconButton size='large' edge='start' onClick={switchDrawer}>
							<MenuIcon />
						</IconButton>
					</Box>
					<SystemInfoBar />
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
						<ListItem key='pilot_list' disablePadding>
							<ListItemButton selected={scoreboardVisible} onClick={() => { scoreboardVisible ? cards.close() : cards.showStationLists(true); }}>
								<MainListIcon><GroupsIcon /></MainListIcon>
								<MainListText primary='Station List' />
							</ListItemButton>
						</ListItem>
						<ListItem key='metar' disablePadding>
							<ListItemButton selected={metarVisible} onClick={() => { setMetarVisible(!metarVisible); }}>
								<MainListIcon><CloudIcon /></MainListIcon>
								<MainListText primary='METAR' />
							</ListItemButton>
						</ListItem>
					</List>
					<List sx={{ position: 'absolute', bottom: '0px', right: '0px', left: '0px' }}>
						<ListItem key='options' disablePadding>
							<ListItemButton selected={optionsVisible} onClick={() => { setOptionsVisible(!optionsVisible); }}>
								<MainListIcon><SettingsIcon /></MainListIcon>
								<MainListText primary='Options' />
							</ListItemButton>
						</ListItem>
					</List>
				</MainDrawer>
				
				<Box sx={{ position: 'relative', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
					<Box sx={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', visibility: mapVisible ? 'hidden' : 'visible' }}>
						<Typography>Map is disabled</Typography>
					</Box>
					<Box ref={mapNode} sx={{ flex: '1 1 auto', width: '100%', ...mapStyle }} />

					<Stack direction='row' sx={{ flex: '1 1 auto', position: 'absolute', height: '100%', pointerEvents: 'none' }} >
						<Stack sx={{ flex: '1 1 auto', position: 'relative', height: '100%', pointerEvents: 'auto' }} >
							<Scoreboard open={scoreboardVisible} />
							<FacilityStationsList />
						</Stack>
						<Stack sx={{ flex: '1 1 auto', position: 'relative', height: 'fit-content', pointerEvents: 'auto' }} >
							<ControllerCard />
							<PilotCard />
							<PrefileCard />
							<AtisCard />
							<MetarBox open={metarVisible} onClose={() => setMetarVisible(false)} />
						</Stack>
					</Stack>

					<Box sx={{ position: 'fixed', right: '0', display: 'flex', flexDirection: 'column' }} >
						<FlightInfoBox open={flightVisible} />
						<SystemInfoBox open={systemVisible} />
					</Box>
				</Box>
			</Box>

			<OptionsBox open={optionsVisible} onClose={() => { setOptionsVisible(false); }} />
		</>
	);
}

export default App;

/*
TODO:
- add local airplane button
- /and/or/ add local planes in Stations Lists (as a tab)
- try to autodetect local airplane, show toast with suggestion

- disable status icons when app disabled
- METAR: add IATA support (use station defs)
- METAR: add button, when ATIS station is available
- rewrite system-ui sync, regroup files, make start sequence reliable (systems), split cards shared
- fix optionsbox not fitting in extremly small screens
- add search bar in lists

- cache VATSpy data + update mechanism (self-host and github)
- try to eliminate large, thin holes in UIRs
- option: airport label icao or iata
- option: airplane label simple or extended
- option: hide areas, planes, airports
- option: hide fields with ATIS only
- option: disable interpolation
- option: interactable area (region+tracon)
- option: hide atis in airport (list)
- better contrast for net planes and area labels (plane color based on altitude)

- implement OSM Vector Tiles
- expose stationless controllers on map
- fallback for FIR/UIR without boundary
- write FIR/UIR/Aiport benchmarks
- investigate KZNY & SUEO - determine oceanic flag
- integrate VATSIM AIP, accurate station names

- device control panel (possibly move to different project, native ImGui app)
- branding, policy, external services and libraries

OSM Vector Tiles:
https://americanamap.org/
https://tile.ourmap.us/

https://stats.vatsim.net/search_id.php?id={cid}
network.updateState(JSON.parse(localStorage.getItem('vatsim_list')!));
https://vatspy-data.kantraksel.workers.dev/release.json

Dataset errors:
[NOT EXPLORED] Boundaries.geojson: some entries (above 700) have numeric properties instead of strings
VATSpy.dat: 9704 - OAKB is not a FIR (most likely OAKX)
VATSpy.dat: 13029 - FIR UULL doesn't exist (most likely ULLL)
VATSpy.dat: 13624 - FIR VMSN doesn't exist (most likely VNSM)
VATSpy.dat: 14234 - UHPP is not a FIR (most likely UHMM)
VATSpy.dat: 12903 & 14234 - XHPL defined twice (slightly different names and coords, second entry has invalid FIR)

Warnings:
VATSpy.dat: 7702 & 7703 - duplicate entry, but only one is pseudo
VATSpy.dat: 18784 - callsign prefix UMMM seems to be invalid, see next UMMV_X
*/
