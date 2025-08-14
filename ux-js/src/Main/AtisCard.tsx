import { Atis } from '../Network/NetworkWorld';
import { createNetUpdate, DataTable, getTimeOnline, StationCard, TextBox } from './CardsShared';
import { useEffect, useState } from 'react';

function AtisCard() {
    const [data, setData] = useState<Atis>();
    const [absent, setAbsent] = useState(false);

    useEffect(() => {
        cards.atisRef = data => {
            setData(data);
            setAbsent(false);
        };

        return () => {
            cards.atisRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!data) {
            return;
        }

        return createNetUpdate(state => {
            const value = state.atis.find(value => value.callsign === data.callsign);
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

    const timeOnline = getTimeOnline(data);
    const info = data.text_atis?.join(' ') ?? 'N/A';

    const table = [
        [
            ['Name:', 'Station:'],
            [data.name, data.frequency],
        ],
        [
            ['Time Online:', 'ATIS Code:'],
            [timeOnline, data.atis_code],
        ],
    ];

    return (
        <StationCard width={500} maxWidth='100vw' title={data.callsign} absent={absent}>
            <DataTable data={table} />
            <TextBox label='Information' value={info} />
        </StationCard>
    );
}
export default AtisCard;
