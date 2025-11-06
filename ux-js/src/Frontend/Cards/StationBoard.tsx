import { IconButton } from "@mui/material";
import { useState } from "react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import ActiveStationBoard from "./Boards/ActiveStationBoard";
import PassiveStationBoard from "./Boards/PassiveStationBoard";
import SearchBoard from "./Boards/SearchBoard";
import DataBox from "./Boards/DataBox";

function StationBoard(props: { open: boolean }) {
    const [row, setRow] = useState(0);
    const [prevRow, setPrevRow] = useState(0);

    let rowButton;
    if (row == 0) {
        rowButton = <IconButton onClick={() => setRow(1)}><ExpandMoreIcon /></IconButton>;
    } else if (row == 1) {
        rowButton = <IconButton onClick={() => setRow(0)}><ExpandLessIcon /></IconButton>;
    }

    const onSwitchSearch = () => {
        if (row == 2) {
            setRow(prevRow);
        } else {
            setPrevRow(row);
            setRow(2);
        }
    };
    const searchIcon = <IconButton onClick={onSwitchSearch}><SearchIcon /></IconButton>;

    return (
        <DataBox visible={props.open}>
            <ActiveStationBoard open={props.open && row == 0} toolsRight={rowButton} toolsLeft={searchIcon} />
            <PassiveStationBoard open={props.open && row == 1} toolsRight={rowButton} toolsLeft={searchIcon} />
            <SearchBoard open={props.open && row == 2} toolsLeft={searchIcon} />
        </DataBox>
    );
}

export default StationBoard;
