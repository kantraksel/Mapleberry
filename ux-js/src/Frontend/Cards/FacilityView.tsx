import { useEffect, useState } from "react";
import { NetworkArea, NetworkAtis, NetworkControl, NetworkController, NetworkField } from "../../Backend/Network/ControlRadar";
import { CardHeader } from "./Elements/CardHeader";
import { CardRightToolbar } from "./Elements/CardRightToolbar";
import { Box, Typography } from "@mui/material";
import DynamicBoard from "./Boards/Elements/DynamicBoard";
import DataBox from "./Boards/DataBox";
import { controllerColumns } from "./Boards/ControllerBoard";

function FacilityView() {
    const [refresh, setRefresh] = useState(0);
    const [facility, setFacility] = useState<NetworkControl>();
    const hasFacility = facility != undefined;

    useEffect(() => {
        cards.facilityRef = setFacility;
        return () => {
            cards.facilityRef = undefined;
        };
    }, []);

    useEffect(() => {
        if (!facility) {
            return;
        }
        const icao = facility.icao;
        const onUpdate = () => {
            setRefresh(refresh + 1);
            setFacility(controlRadar.getStation(icao));
        };
        controlRadar.Update.add(onUpdate);
        return () => {
            controlRadar.Update.delete(onUpdate);
        };
    }, [facility, refresh]);

    let list: (NetworkController | NetworkAtis)[] | undefined;
    let stationName = '';
    if (facility) {
        if (facility instanceof NetworkArea) {
            list = facility.controllers;
            stationName = facility.station.name;
        } else if (facility instanceof NetworkField) {
            list = [...facility.controllers, ...facility.atis];
            stationName = facility.station.name;
        }
    }

    return (
        <DataBox visible={hasFacility}>
            <CardHeader>
                <CardRightToolbar />
                <Box sx={{ padding: '8px', paddingTop: '6.5px' }}>
                    <Typography variant='h5'>{stationName}</Typography>
                </Box>
            </CardHeader>
            <DynamicBoard enabled={hasFacility} columns={controllerColumns} values={() => list} />
        </DataBox>
    );
}

export default FacilityView;
