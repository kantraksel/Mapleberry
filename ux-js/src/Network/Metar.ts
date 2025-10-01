class Metar {
    public async get(icao: string) {
        icao = icao.trim().toUpperCase();
        const station = controlStations.getAirport(icao);
        if (station) {
            icao = station.icao;
        } else if (icao.length != 4) {
            return { text: 'Invalid airport code' };
        }

        try {
            const text = await vatsim.getMetar(icao);
            if (text.length == 0) {
                return { text: 'Airport not found' };
            }
            const station = controlRadar.getStation(icao);
            return { text, station };
        } catch (e: unknown) {
            return { text: 'Failed to fetch METAR' };
        }        
    }
}

export default Metar;
