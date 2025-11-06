import DynamicBoard, { Column } from "./DynamicBoard";

export default function NetworkList<Value>(props: { enabled: boolean, columns: Column<Value>[], values: () => Value[] | undefined }) {
    const label = network.getState() !== undefined ? undefined : 'Network is disabled';
    return <DynamicBoard enabled={props.enabled} columns={props.columns} values={props.values} replaceLabel={label} />;
}
