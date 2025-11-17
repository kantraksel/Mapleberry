import { Box, createTheme, CSSObject, Drawer, ListItemIcon, ListItemText } from "@mui/material";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

const MainDrawerContext = createContext(true);

function MainDrawer(props: { children: ReactNode, open: boolean }) {
    const drawer = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState('auto');

    useEffect(() => {
        setWidth(`${drawer.current!.firstElementChild!.getBoundingClientRect().width}px`);
    }, []);

    let open = props.open;
    if (width === 'auto') {
        open = true;
    }
    const theme = createTheme();

    let style: CSSObject;
    if (open) {
        style = {
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
            width: width,
            whiteSpace: 'nowrap',
            overflowX: 'hidden',
        };
    } else {
        style = {
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            width: theme.spacing(7),
            whiteSpace: 'nowrap',
            overflowX: 'hidden',
        };
    }
    style = {
        height: '100%',
        ...style,
        '& .MuiDrawer-paper': style,
    };

    return (
        <Drawer ref={drawer} variant='permanent' sx={style} open={true}>
            <Box sx={theme.mixins.toolbar} />
            <MainDrawerContext value={open} >
                {props.children}
            </MainDrawerContext>
        </Drawer>
    );
}
export default MainDrawer;
export { MainDrawerContext };

export function MainDrawerEntry({ icon, label }: { icon: ReactNode, label: ReactNode }) {
    const drawerOpen = useContext(MainDrawerContext);
    return (
        <>
            <ListItemIcon sx={{ minWidth: '40px' }}>{icon}</ListItemIcon>
            <ListItemText primary={label} sx={{ opacity: drawerOpen ? 1 : 0 }} />
        </>
    );
}
