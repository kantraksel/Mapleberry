import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";

function MapCanvas() {
	const [mapVisible, setMapVisible] = useState(map.visible);
    const mapNode = useRef<HTMLDivElement>(null);

    useEffect(() => {
        map.setParent(mapNode.current!);
		map.visibilityEvent.add(setMapVisible);

        return () => {
            map.visibilityEvent.delete(setMapVisible);
        };
    }, []);

    let mapStyle;
	if (mapVisible) {
		mapStyle = {
            flex: '1 1 auto',
            width: '100%',

			visibility: 'visible',
			opacity: 1,
			transition: 'opacity 0.25s linear, visibility 0.25s',
		};
	} else {
		mapStyle = {
            flex: '1 1 auto',
            width: '100%',

			visibility: 'hidden',
			opacity: 0,
			transition: 'opacity 0.25s ease, visibility 0.25s',
		};
	}
    const disabledStyle = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        visibility: mapVisible ? 'hidden' : 'visible',
    };

    return (
        <>
            <Box sx={disabledStyle}>
                <Typography>Map is disabled</Typography>
            </Box>
            <Box ref={mapNode} sx={mapStyle} />
        </>
    );
}
export default MapCanvas;
