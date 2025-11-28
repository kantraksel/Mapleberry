type OptionKeys =
    'map_visible' |
    'map_last_position' |
    'vatsim_enabled' |
    'vatsim_refresh_rate' |
    'user_custom_callsign' |
    'radar_follow_scale_map' | 
    'server_autostart' |
    'simcom_reconnect' |
    'app_enabled' |
    'app_port' |
    'app_reconnect_span' |
    'vatsim_user_id' |
    'radar_interpolate' |
    'radar_interactable_areas' |
    'cards_show_atis_facility_view' |
    'map_type' |
    'map_use_locale' |
    'user_network_callsign' |
    '_unused_';

class Options {
    items: Map<string, unknown>;
    refreshHook?: () => void;

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

    public refresh() {
        this.refreshHook?.call(null);
    }
}

export default Options;
