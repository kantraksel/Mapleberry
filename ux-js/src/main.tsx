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
import Radar from './Map/Radar.ts';
import UserTracker from './Map/UserTracker.ts';
import PlaneLayers from './Map/PlaneLayers.ts';
import VATSIM from './Map/VATSIM.ts';

declare global {
	var hostBridge: HostBridge;
	var hostState: HostState;
	var map: GlobalMap;
	var planeLayers: PlaneLayers;
	var radar: Radar;
	var tracker: UserTracker;
	var vatsim: VATSIM;
}
window.hostBridge = new HostBridge();
window.hostState = new HostState();
window.map = new GlobalMap();
window.planeLayers = new PlaneLayers();
window.radar = new Radar();
window.tracker = new UserTracker();
window.vatsim = new VATSIM();

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
