import { IconButton } from "@mui/material";
import NotesIcon from '@mui/icons-material/Notes';

export default function OpenButton({ onClick, disabled }: { onClick?: () => void, disabled?: boolean }) {
    return <IconButton onClick={onClick} size='small' disabled={disabled}><NotesIcon fontSize='small' /></IconButton>;
}