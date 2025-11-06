import { useState, useEffect } from 'react';
import { AppBar, Box, createTheme, IconButton, List, ListItem, ListItemButton, Stack, Toolbar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupsIcon from '@mui/icons-material/Groups';
import CloudIcon from '@mui/icons-material/Cloud';
import 'ol/ol.css';
import OptionsBox from '../OptionsBox';
import ControllerCard from '../Cards/ControllerCard';
import PilotCard from '../Cards/PilotCard';
import SystemInfoBar from '../SystemInfoBar';
import PrefileCard from '../Cards/PrefileCard';
import AtisCard from '../Cards/AtisCard';
import MetarBox from '../MetarBox';
import ActiveFlightButton from '../ActiveFlightButton';
import NotificationBox from '../NotificationBox';
import MainDrawer, { MainDrawerEntry } from './MainDrawer';
import MapCanvas from './MapCanvas';
import StationBoard from '../Cards/StationBoard';
import FacilityView from '../Cards/FacilityView';

function App() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [optionsVisible, setOptionsVisible] = useState(false);
	const [stationBoardVisible, setStationBoardVisible] = useState(false);
	const [metarVisible, setMetarVisible] = useState(false);
	
	useEffect(() => {
		cards.stationsRef = setStationBoardVisible;
		hostState.notifyAppReady();

		return () => {
			cards.stationsRef = undefined;
		};
	}, []);

	const theme = createTheme();

	return (
		<>
			<AppBar sx={{ zIndex: theme.zIndex.drawer + 100 }}>
				<Toolbar>
					<Box sx={{ flexGrow: 1 }}>
						<IconButton size='large' edge='start' onClick={() => setDrawerOpen(!drawerOpen)}>
							<MenuIcon />
						</IconButton>
					</Box>
					<SystemInfoBar />
				</Toolbar>
			</AppBar>
			<Box sx={theme.mixins.toolbar} />

			<Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'row' }}>
				<MainDrawer open={drawerOpen}>
					<List>
						<ListItem key='flight_status' disablePadding>
							<ActiveFlightButton />
						</ListItem>
						<ListItem key='pilot_list' disablePadding>
							<ListItemButton selected={stationBoardVisible} onClick={() => { stationBoardVisible ? cards.close() : cards.showStationLists(true); }}>
								<MainDrawerEntry icon={<GroupsIcon />} label='Station List' />
							</ListItemButton>
						</ListItem>
						<ListItem key='metar' disablePadding>
							<ListItemButton selected={metarVisible} onClick={() => { setMetarVisible(!metarVisible); }}>
								<MainDrawerEntry icon={<CloudIcon />} label='METAR' />
							</ListItemButton>
						</ListItem>
					</List>
					<List sx={{ position: 'absolute', bottom: '0px', right: '0px', left: '0px' }}>
						<ListItem key='options' disablePadding>
							<ListItemButton selected={optionsVisible} onClick={() => { setOptionsVisible(!optionsVisible); }}>
								<MainDrawerEntry icon={<SettingsIcon />} label='Options' />
							</ListItemButton>
						</ListItem>
					</List>
				</MainDrawer>
				
				<Box sx={{ position: 'relative', flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
					<MapCanvas />

					<Stack direction='row' sx={{ flex: '1 1 auto', position: 'absolute', height: '100%', pointerEvents: 'none' }} >
						<Stack sx={{ flex: '1 1 auto', position: 'relative', height: '100%', pointerEvents: 'auto' }} >
							<StationBoard open={stationBoardVisible} />
							<FacilityView />
						</Stack>
						<Stack sx={{ flex: '1 1 auto', position: 'relative', height: 'fit-content', pointerEvents: 'auto' }} >
							<ControllerCard />
							<PilotCard />
							<PrefileCard />
							<AtisCard />
							<MetarBox open={metarVisible} onClose={() => setMetarVisible(false)} />
						</Stack>
					</Stack>
				</Box>
			</Box>

			<NotificationBox />
			<OptionsBox open={optionsVisible} onClose={() => { setOptionsVisible(false); }} />
		</>
	);
}

export default App;

/*
TODO:
- rewrite system-ui sync, regroup files, make start sequence reliable (systems), split cards shared

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
- add transition on color changes of sim status
- notifications: transitions in-out, visible timer

- implement OSM Vector Tiles
- expose stationless controllers on map
- fallback for FIR/UIR without boundary
- write FIR/UIR/Aiport benchmarks
- investigate KZNY & SUEO - determine oceanic flag
- integrate VATSIM AIP, accurate station names

- branding, policy, external services and libraries

OSM Vector Tiles:
https://americanamap.org/
https://tile.ourmap.us/

network.updateState(JSON.parse(localStorage.getItem('vatsim_list')!));
https://vatspy-data.kantraksel.workers.dev/release.json
https://theboostcpplibraries.com/boost.asio-io-services-and-io-objects

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
