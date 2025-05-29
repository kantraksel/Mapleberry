type OptionKeys =
    'map_visible' |
    'map_last_position' |
    'vatsim_enabled' |
    'vatsim_refresh_rate' |
    'user_custom_callsign' |
    'radar_follow_scale_map' | 
    '_unused_';

class Options {
    items: Map<string, unknown>;

    constructor() {
        this.items = new Map();
    }

    public get<Type>(key: OptionKeys, fallback: Type) {
        let item = this.items.get(key);
        if (item !== undefined) {
            return item as Type;
        }

        const str = localStorage.getItem(key);
        if (!str) {
            this.items.set(key, fallback);
            return fallback;
        }
        item = JSON.parse(str);
        this.items.set(key, item);
        return item as Type;
    }

    public set(key: OptionKeys, value: unknown) {
        if (value === undefined) {
            this.items.delete(key);
            localStorage.removeItem(key);
            return;
        }
        let blob = JSON.stringify(value);
        this.items.set(key, value);
        localStorage.setItem(key, blob);
    }
}

export default Options;
