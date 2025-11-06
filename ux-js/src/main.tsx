import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import './index.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/cascadia-code/500.css';
import '@fontsource/cascadia-code/500-italic.css';
import App from './Frontend/MainFrame/App.tsx';
import HostBridge from './Backend/Host/HostBridge.ts';
import HostState from './Backend/Host/HostState.ts';
import GlobalMap from './Backend/Map/GlobalMap.ts';
import Radar from './Backend/Radar/Radar.ts';
import UserTracker from './Backend/Radar/Sources/UserTracker.ts';
import PlaneLayers from './Backend/Map/PlaneLayers.ts';
import VATSIM from './Backend/Network/VATSIM.ts';
import Options from './Backend/Options.ts';
import LocalTraffic from './Backend/Radar/Sources/LocalTraffic.ts';
import Cards from './Backend/Cards.ts';
import ControlLayers from './Backend/Map/ControlLayers.ts';
import ControlStations from './Backend/Network/ControlStations.ts';
import ControlRadar from './Backend/Network/ControlRadar.ts';
import TrafficRadar from './Backend/Network/TrafficRadar.ts';
import NetworkWorld from './Backend/Network/NetworkWorld.ts';
import Metar from './Backend/Network/Metar.ts';
import Replay from './Backend/Host/Replay.ts';
import Notifications from './Backend/Notifications.ts';

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
	var network: NetworkWorld;
	var metar: Metar;
	var replay: Replay;
	var notifications: Notifications;
}
window.options = new Options();
window.notifications = new Notifications();
window.hostBridge = new HostBridge();
window.hostState = new HostState();
window.map = new GlobalMap();
window.controlLayers = new ControlLayers();
window.planeLayers = new PlaneLayers();
window.radar = new Radar();
window.traffic = new LocalTraffic();
window.tracker = new UserTracker();
window.vatsim = new VATSIM();
window.network = new NetworkWorld();
window.controlStations = new ControlStations();
window.metar = new Metar();
window.controlRadar = new ControlRadar();
window.trafficRadar = new TrafficRadar();
window.cards = new Cards();
window.replay = new Replay();

controlLayers.setupLayers();
planeLayers.setupLayers();
controlLayers.setupLabelLayers();

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
