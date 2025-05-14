import { useEffect, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import AirlinesIcon from '@mui/icons-material/Airlines';
import FlightIcon from '@mui/icons-material/Flight';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import RadioIcon from '@mui/icons-material/Radio';
import InfoBox from './InfoBox';

function FlightInfoBox(props: { open: boolean }) {
    const [flight, setFlight] = useState(tracker.getIdentity());

    useEffect(() => {
        tracker.identEvent.add(setFlight);

        return () => {
            tracker.identEvent.delete(setFlight);
        }
    }, []);

	if (!props.open) {
		return <></>;
	}

    return (
		<InfoBox width={330}>
			<Typography variant='h4' sx={{ margin: '2px' }}>Local Flight</Typography>
			<Divider flexItem />

			<Box display='flex' flexDirection='row' alignItems='center' sx={{ m: '5px' }}>
				<Box display='flex' flexDirection='row' alignItems='center'>
					<AirlinesIcon color='info' />
					<Typography sx={{ ml: '5px' }}>{flight.callsign}</Typography>
				</Box>
				<Box display='flex' flexDirection='row' alignItems='center' sx={{ ml: '10px' }}>
					<FlightIcon color='info' />
					<Typography sx={{ ml: '5px' }}>{flight.plane}</Typography>
				</Box>
			</Box>

			<Divider flexItem />
			<Box display='flex' flexDirection='column' alignItems='center' sx={{ m: '7px' }}>
				<Box display='flex' flexDirection='row' alignItems='center' sx={{ m: '2px' }}>
					<FlightTakeoffIcon color='info' />
					<Typography sx={{ ml: '5px' }}>EDDF Frankfurt am Main</Typography>
				</Box>
				<Box display='flex' flexDirection='row' alignItems='center' sx={{ m: '2px' }}>
					<FlightLandIcon color='info' />
					<Typography sx={{ ml: '5px' }}>EGLL London Heathrow</Typography>
				</Box>
				<Box display='flex' flexDirection='row' alignItems='center'>
					<Box display='flex' flexDirection='row' alignItems='center'>
						<RadioIcon color='success' sx={{ minHeight: '30px' }} />
						<Typography sx={{ ml: '5px', mt: '6px' }}>122.800</Typography>
					</Box>
					<Box display='flex' flexDirection='row' alignItems='center' sx={{ ml: '10px' }}>
						<RadioIcon color='warning' sx={{ minHeight: '30px' }} />
						<Typography sx={{ ml: '5px', mt: '6px' }}>122.800</Typography>
					</Box>
				</Box>
			</Box>
		</InfoBox>
    );
}

export default FlightInfoBox;
