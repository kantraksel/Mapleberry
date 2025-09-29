class Metar {
    public async get(icao: string) {
        icao = icao.trim().toUpperCase();
        if (icao.length != 4) {
            return 'Invalid airport code';
        }

        try {
            const text = await vatsim.getMetar(icao);
            if (text.length == 0) {
                return 'Airport not found';
            }
            return text;
        } catch (e: unknown) {
            return 'Failed to fetch METAR';
        }        
    }
}

export default Metar;
