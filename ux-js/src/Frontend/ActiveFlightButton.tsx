import { useEffect, useState } from "react";
import { ListItemButton } from "@mui/material";
import FlightIcon from '@mui/icons-material/Flight';
import RadarPlane from "../Backend/LocalRadar/RadarPlane";
import { MainDrawerEntry } from "./MainFrame/MainDrawer";

function ActiveFlightButton() {
    const [enabled, setEnabled] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onUpdate = () => {
            const user = tracker.getUser();
            if (user) {
                setEnabled(true);
                return;
            }
            const pilot = trafficRadar.getUser();
            if (pilot) {
                setEnabled(true);
            } else {
                setEnabled(false);
                setVisible(false);
            }
        };
        const onUserUpdate = (plane: RadarPlane) => {
            if (plane.main) {
                onUpdate();
            }
        };

        trafficRadar.UpdateLocal.add(onUpdate);
        radar.planeAdded.add(onUserUpdate);
        radar.planeRemoved.add(onUserUpdate);
        return () => {
            trafficRadar.UpdateLocal.delete(onUpdate);
            radar.planeAdded.delete(onUserUpdate);
            radar.planeRemoved.delete(onUserUpdate);
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
            const user = tracker.getUser();
            if (user) {
                radar.animator.followPlane(user);
            }
        } else {
            cards.close();
            radar.animator.unfollowPlane();
            setVisible(false);
        }
	};

    return (
        <ListItemButton selected={visible} onClick={switchFlight} disabled={!enabled}>
            <MainDrawerEntry icon={<FlightIcon />} label='Active Flight' />
        </ListItemButton>
    )
}
export default ActiveFlightButton;
