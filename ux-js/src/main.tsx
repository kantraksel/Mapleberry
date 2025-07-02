import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import './index.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from './Main/App.tsx';
import HostBridge from './Host/HostBridge.ts';
import HostState from './Host/HostState.ts';
import GlobalMap from './Map/GlobalMap.ts';
import Radar from './Radar/Radar.ts';
import UserTracker from './Radar/Sources/UserTracker.ts';
import PlaneLayers from './Map/PlaneLayers.ts';
import VATSIM from './Network/VATSIM.ts';
import Options from './Options.ts';
import LocalTraffic from './Radar/Sources/LocalTraffic.ts';
import Cards from './Cards.ts';
import ControlLayers from './Map/ControlLayers.ts';
import ControlStations from './Network/ControlStations.ts';
import ControlRadar from './Network/ControlRadar.ts';
import TrafficRadar from './Network/TrafficRadar.ts';

declare global {
	var hostBridge: HostBridge;
	var hostState: HostState;
	var map: GlobalMap;
	var planeLayers: PlaneLayers;
	var radar: Radar;
	var traffic: LocalTraffic;
	var tracker: UserTracker;
	var vatsim: VATSIM;
	var options: Options;
	var cards: Cards;
	var controlLayers: ControlLayers;
	var controlStations: ControlStations;
	var controlRadar: ControlRadar;
	var trafficRadar: TrafficRadar;
}
window.options = new Options();
window.hostBridge = new HostBridge();
window.hostState = new HostState();
window.map = new GlobalMap();
window.planeLayers = new PlaneLayers();
window.controlLayers = new ControlLayers();
window.radar = new Radar();
window.traffic = new LocalTraffic();
window.tracker = new UserTracker();
window.vatsim = new VATSIM();
window.controlStations = new ControlStations();
window.controlRadar = new ControlRadar();
window.trafficRadar = new TrafficRadar();
window.cards = new Cards();

const theme = createTheme({
	palette: {
		mode: 'dark',
	},
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<App />
		</ThemeProvider>
	</StrictMode>
);
