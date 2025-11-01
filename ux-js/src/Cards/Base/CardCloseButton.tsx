import { IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

export function CardCloseButton() {
    return <IconButton onClick={() => cards.close()}><CloseIcon /></IconButton>;
}
