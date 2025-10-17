import { useEffect, useState } from "react";
import { ListItemButton } from "@mui/material";
import { MainListIcon, MainListText } from "./App";
import FlightIcon from '@mui/icons-material/Flight';

function ActiveFlightButton() {
    const [enabled, setEnabled] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onUpdate = () => {
            const pilot = trafficRadar.getUser();
            if (!!pilot) {
                setEnabled(true);
            } else {
                setEnabled(false);
                setVisible(false);
            }
        };

        trafficRadar.UpdateLocal.add(onUpdate);
        return () => {
            trafficRadar.UpdateLocal.delete(onUpdate);
        }
    }, []);

    useEffect(() => {
        if (!enabled || !visible) {
            return;
        }
        const onChange = () => {
            setVisible(false);
        };

        cards.Change.add(onChange);
        return () => {
            cards.Change.delete(onChange);
        };
    }, [enabled, visible]);

    const switchFlight = () => {
		if (!visible) {
            const pilot = trafficRadar.getUser();
			if (pilot) {
                cards.showPilotCard(pilot, false, true);
                setVisible(true);

                if (pilot.external) {
                    radar.animator.followPlane(pilot.external);
                } else {
                    const params = pilot.blip.getPhysicParams();
                    radar.animator.unfollowPlane();
                    map.setCenterZoom(params.longitude, params.latitude);
                }
                return;
            }
		} else {
            cards.close();
            setVisible(false);
        }
	};

    return (
        <ListItemButton selected={visible} onClick={switchFlight} disabled={!enabled}>
            <MainListIcon><FlightIcon /></MainListIcon>
            <MainListText primary='Active Flight' />
        </ListItemButton>
    )
}
export default ActiveFlightButton;
