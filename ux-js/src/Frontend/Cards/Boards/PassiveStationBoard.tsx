import { ReactNode, useEffect, useState } from "react";
import { createNetUpdate } from "../Shared";
import { Box, Tab, Tabs } from "@mui/material";
import { CardHeader } from "../Elements/CardHeader";
import { CardToolbar } from "../Elements/CardToolbar";
import { CardRightToolbar } from "../Elements/CardRightToolbar";
import PrefileBoard from "./PrefileBoard";
import ObserverBoard from "./ObserverBoard";
import AtisBoard from "./AtisBoard";
import useRev from "../../useRev";

function PassiveStationBoard(props: { open: boolean, toolsRight: ReactNode, toolsLeft: ReactNode }) {
    const [tab, setTab] = useState(0);
    const [rev, addRev] = useRev();

    useEffect(() => {
        if (!props.open) {
            return;
        }
        return createNetUpdate(() => {
            addRev();
        });
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
                <Tabs value={tab} onChange={onClickTab} centered sx={{ display }}>
                    <Tab label='ATIS' />
                    <Tab label='Observers' />
                    <Tab label='Prefiles' />
                </Tabs>
            </CardHeader>
            <PrefileBoard enabled={tabIdx == 2} />
            <ObserverBoard enabled={tabIdx == 1} />
            <AtisBoard enabled={tabIdx == 0} />
        </Box>
    );
}

export default PassiveStationBoard;