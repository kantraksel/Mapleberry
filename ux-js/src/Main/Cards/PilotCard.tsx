import { Divider } from '@mui/material';
import { createControlRadarUpdate, DataTable, getFlightplan, getPilotRating, getTimeOnline, RouteBox, StationCard } from './CardsShared';
import { useEffect, useState } from 'react';
import { NetworkPilot } from '../../Network/TrafficRadar';

function PilotCard() {
    const [object, setObject] = useState<NetworkPilot>();
    const [absent, setAbsent] = useState(false);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        cards.pilotRef = value => {
            setObject(value);
            setAbsent(false);
            setRev(rev + 1);
        };

        return () => {
            cards.pilotRef = undefined;
        };
    }, [rev]);

    useEffect(() => {
        if (!object) {
            return;
        }
        
        return createControlRadarUpdate(() => {
            if (!object.expired()) {
                setRev(rev + 1);
            } else {
                const pilot = trafficRadar.findPilot(object);
                if (pilot) {
                    setObject(pilot);
                    setAbsent(false);
                    setRev(rev + 1);
                } else {
                    setAbsent(true);
                }
            }
        });
    }, [object, rev]);
    
    if (!object) {
        return <></>;
    }
    const data = object.pilot;

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

    const onFocus = () => {
        if (object.external) {
            radar.animator.followPlane(object.external);
            return;
        }
        const params = object.plane.getPhysicParams();
        if (params) {
            radar.animator.unfollowPlane();
            map.setCenterZoom(params.longitude, params.latitude);
        }
    };

    return (
        <StationCard width='auto' maxWidth='100vw' minWidth={500} title={data.callsign} absent={absent} onTitleClick={onFocus}>
            <DataTable data={table} />
            <Divider flexItem sx={{ mt: '5px', mb: '5px' }} />
            <RouteBox flight_plan={flightplan} />
        </StationCard>
    );
}
export default PilotCard;
