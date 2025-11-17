import { useEffect, useState } from "react";
import { CardHeader } from "./Elements/CardHeader";
import { CardRightToolbar } from "./Elements/CardRightToolbar";
import { Box, Typography } from "@mui/material";
import DynamicBoard from "./Boards/Elements/DynamicBoard";
import DataBox from "./Boards/DataBox";
import { controllerColumns } from "./Boards/ControllerBoard";
import NetworkControl from "../../Backend/NetworkUplink/Source/Objects/NetworkControl";
import NetworkController from "../../Backend/NetworkUplink/Source/Objects/NetworkController";
import NetworkAtis from "../../Backend/NetworkUplink/Source/Objects/NetworkAtis";
import NetworkArea from "../../Backend/NetworkUplink/Source/Objects/NetworkArea";
import NetworkField from "../../Backend/NetworkUplink/Source/Objects/NetworkField";
import useRev from "../useRev";

function FacilityView() {
    const [rev, addRev] = useRev();
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
            addRev();
            setFacility(controlRadar.getStation(icao));
        };
        controlRadar.Update.add(onUpdate);
        return () => {
            controlRadar.Update.delete(onUpdate);
        };
    }, [facility, rev]);

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
