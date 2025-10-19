import { Divider } from '@mui/material';
import { Prefile } from '../../Network/NetworkWorld';
import { createNetUpdate, DataTable, getFlightplan, RouteBox, StationCard, UserName } from './CardsShared';
import { useEffect, useState } from 'react';

function PrefileCard() {
    const [data, setData] = useState<Prefile>();
    const [absent, setAbsent] = useState(false);

    useEffect(() => {
        cards.prefileRef = value => {
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
            const value = state.prefiles.find(value => (value.cid === data.cid));
            if (value) {
                setData(value);
                setAbsent(false);
            } else {
                const pilot = trafficRadar.findPilotById(data.cid);
                if (pilot) {
                    cards.showPilotCard(pilot, true);
                } else {
                    setAbsent(true);
                }
            }
        });
    }, [data]);
    
    if (!data) {
        return <></>;
    }

    const flightplan = getFlightplan(data);

    const table = [
        [['Name:'], [<UserName cid={data.cid} name={data.name} />]],
        [['Aircraft:'], [flightplan.aircraft_faa]],
    ];

    return (
        <StationCard width={500} title={data.callsign} absent={absent}>
            <DataTable data={table} />
            <Divider flexItem sx={{ mt: '5px', mb: '5px' }} />
            <RouteBox flight_plan={flightplan} />
        </StationCard>
    );
}
export default PrefileCard;
