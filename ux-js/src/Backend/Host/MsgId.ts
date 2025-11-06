export enum MsgId {
    _reserved = 0,

    SendAllData = 1,
    ModifySystemState = 2,
    ModifySystemProperties = 3,
    RadarAddAircraft = 4,
    RadarRemoveAircraft = 5,
    RadarUpdateAircraft = 6,
    LocalAddAircraft = 7,
    LocalRemoveAircraft = 8,
    LocalUpdateAircraft = 9,

    _last,
};

export function isMsgId(id: unknown) {
    return typeof id === 'number' && id > MsgId._reserved && id < MsgId._last;
}
