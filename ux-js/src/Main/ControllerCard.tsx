import { Controller } from '../Network/NetworkWorld';
import { createNetUpdate, DataTable, getControllerRating, getStation, getTimeOnline, StationCard, TextBox } from './CardsShared';
import { useEffect, useState } from 'react';

function ControllerCard() {
    const [data, setData] = useState<Controller>();
    const [absent, setAbsent] = useState(false);

    useEffect(() => {
        cards.controllerRef = data => {
            setData(data);
            setAbsent(false);
        };

        return () => {
            cards.controllerRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }

        return createNetUpdate(state => {
            const value = state.controllers.find(value => value.cid === data.cid && value.callsign === data.callsign);
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

    const rating = getControllerRating(data);
    const timeOnline = getTimeOnline(data);
    const station = getStation(data);
    const info = data.text_atis?.join('\n') ?? 'N/A';

    const table = [
        [
            ['Name:', 'Station:'],
            [data.name, station],
        ],
        [
            ['Controller Rating:', 'Time Online:'],
            [rating, timeOnline],
        ],
    ];

    return (
        <StationCard width='auto' maxWidth='100vw' title={data.callsign} absent={absent}>
            <DataTable data={table} />
            <TextBox label='Information' value={info} />
        </StationCard>
    );
}
export default ControllerCard;
