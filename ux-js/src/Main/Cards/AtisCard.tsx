import { NetworkAtis, NetworkField } from '../../Network/ControlRadar';
import { createControlRadarUpdate, DataTable, getTimeOnline, StationCard, TextBox } from './CardsShared';
import { useEffect, useState } from 'react';

function AtisCard() {
    const [object, setObject] = useState<NetworkAtis>();
    const [absent, setAbsent] = useState(false);
    const [rev, setRev] = useState(0);

    useEffect(() => {
        cards.atisRef = data => {
            setObject(data);
            setAbsent(false);
            setRev(rev + 1);
        };

        return () => {
            cards.atisRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!object) {
            return;
        }

        return createControlRadarUpdate(() => {
            if (!object.expired()) {
                setRev(rev + 1);
            } else {
                const controller = controlRadar.findAtis(object);
                if (controller) {
                    setObject(controller);
                    setAbsent(false);
                    setRev(rev + 1);
                } else {
                    setAbsent(true);
                }
            }
        });
    }, [object]);

    if (!object) {
        return <></>;
    }
    const data = object.data;

    const timeOnline = getTimeOnline(data);
    const info = data.text_atis?.join(' ') ?? 'N/A';
    let code = data.atis_code;
    if (code.length == 0) {
        code = 'N/A';
    }

    const table = [
        [
            ['Name:', 'Station:'],
            [data.name, data.frequency],
        ],
        [
            ['Time Online:', 'ATIS Code:'],
            [timeOnline, code],
        ],
    ];

    let onFocus;
    const station = object.station;
    if (station instanceof NetworkField) {
        const lon = station.station.longitude;
        const lat = station.station.latitude;
        onFocus = () => {
            radar.animator.unfollowPlane();
            map.setCenterZoom(lon, lat);
        };
    }

    return (
        <StationCard width={500} maxWidth='100vw' title={data.callsign} absent={absent} onTitleClick={onFocus}>
            <DataTable data={table} />
            <TextBox label='Information' value={info} />
        </StationCard>
    );
}
export default AtisCard;
