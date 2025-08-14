import { Divider } from '@mui/material';
import { Pilot } from '../Network/NetworkWorld';
import { createNetUpdate, DataTable, getFlightplan, getPilotRating, getTimeOnline, RouteBox, StationCard } from './CardsShared';
import { useEffect, useState } from 'react';

function PilotCard() {
    const [data, setData] = useState<Pilot>();
    const [absent, setAbsent] = useState(false);

    useEffect(() => {
        cards.pilotRef = value => {
            setData(value);
            setAbsent(false);
        };

        return () => {
            cards.pilotRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }

        return createNetUpdate(state => {
            const value = state.pilots.find(value => (value.cid === data.cid));
            if (value) {
                setData(value);
                setAbsent(false);
            } else {
                setAbsent(true);
            }
        });
    }, [data]);
    
    if (!data) {
        return <></>;
    }

    const flightplan = getFlightplan(data);
    const rating = getPilotRating(data);
    const timeOnline = getTimeOnline(data);

    const table = [
        [
            ['Name:', 'Aircraft:'],
            [data.name, flightplan.aircraft_faa],
        ],
        [
            ['Pilot Rating:', 'Time Online:'],
            [rating, timeOnline],
        ],
    ];

    return (
        <StationCard width='auto' maxWidth='100vw' title={data.callsign} absent={absent}>
            <DataTable data={table} />
            <Divider flexItem sx={{ mt: '5px', mb: '5px' }} />
            <RouteBox flight_plan={flightplan} />
        </StationCard>
    );
}
export default PilotCard;
