import { Box, Tab, Tabs } from "@mui/material";
import { ReactNode, useEffect, useState } from "react";
import { CardHeader } from "../Elements/CardHeader";
import { CardToolbar } from "../Elements/CardToolbar";
import { CardRightToolbar } from "../Elements/CardRightToolbar";
import PilotBoard from "./PilotBoard";
import ControllerBoard from "./ControllerBoard";
import LocalPlaneBoard from "./LocalPlaneBoard";
import useRev from "../../useRev";

function ActiveStationBoard(props: { open: boolean, toolsRight: ReactNode, toolsLeft: ReactNode }) {
    const [tab, setTab] = useState(0);
    const [rev, addRev] = useRev();

    useEffect(() => {
        if (!props.open) {
            return;
        }

        radar.planeAdded.add(addRev);
        radar.planeRemoved.add(addRev);
        network.Update.add(addRev);
        return () => {
            radar.planeAdded.delete(addRev);
            radar.planeRemoved.delete(addRev);
            network.Update.delete(addRev);
        };
    }, [rev, props.open]);

    const display = props.open ? 'flex' : 'none';
    const tabIdx = props.open ? tab : -1;
    const onClickTab = (_e: unknown, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ display, width: 'stretch', height: '100%', flexDirection: 'column' }}>
            <CardHeader>
                <CardToolbar direction='row'>{props.toolsLeft}</CardToolbar>
                <CardRightToolbar>{props.toolsRight}</CardRightToolbar>
                <Tabs value={tab} onChange={onClickTab} centered>
                    <Tab label='Controllers' />
                    <Tab label='Pilots' />
                    <Tab label='Planes' />
                </Tabs>
            </CardHeader>
            <PilotBoard enabled={tabIdx == 1} />
            <ControllerBoard enabled={tabIdx == 0} />
            <LocalPlaneBoard enabled={tabIdx == 2} />
        </Box>
    );
}

export default ActiveStationBoard;
