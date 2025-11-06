import { TextField } from "@mui/material";
import { useState } from "react";

export default function NumberField(props: { label?: string, disabled?: boolean, defaultValue?: number, placeholder?: string, onBlur?: (value: number | undefined) => void }) {
    const [valid, setValid] = useState(true);

    const onChange = (event: unknown) => {
        const e = event as { target: {value: string} };
        const value = e.target.value;

        if (value.length == 0) {
            setValid(true);
            return;
        }
        const n = parseInt(value);
        setValid(n.toString() === value);
    };

    const onBlur = (event: unknown) => {
        if (!props.onBlur) {
            return;
        }
        const e = event as { target: {value: string} };
        const value = e.target.value;

        let n = parseInt(value);
        if (n.toString() !== value) {
            props.onBlur(undefined);
        } else {
            props.onBlur(n);
        }
    };

    return <TextField variant='outlined' size='small' disabled={props.disabled} label={props.label} defaultValue={props.defaultValue} placeholder={props.placeholder} error={!valid} onChange={onChange} onBlur={onBlur} />;
}
