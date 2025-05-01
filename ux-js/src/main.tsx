import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import './index.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from './Main/App.tsx';
import HostBridge from './HostBridge.ts';
import HostState from './HostState.ts';
import GlobalMap from './Map/GlobalMap.ts';
import PlaneRadar from './Map/PlaneRadar.ts';
import UserTracker from './Map/UserTracker.ts';

declare global {
	var hostBridge: HostBridge;
	var hostState: HostState;
	var map: GlobalMap;
	var radar: PlaneRadar;
	var tracker: UserTracker;
}
window.hostBridge = new HostBridge();
window.hostState = new HostState();
window.map = new GlobalMap();
window.radar = new PlaneRadar();
window.tracker = new UserTracker();

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
