import { controllerColumns } from "./ControllerBoard";
import NetworkBoard from "./Elements/NetworkBoard";

export default function AtisBoard(props: { enabled: boolean }) {
    const data = () => controlRadar.getAtisList();
    return <NetworkBoard enabled={props.enabled} columns={controllerColumns} values={data} />;
}
