import { Box } from "@mui/material";

export default function Header(props: { children: string }) {
    return <Box sx={{ display: 'block', fontSize: '1.3em', fontWeight: 'bold', textAlign: 'center' }}>{props.children}</Box>;
}
