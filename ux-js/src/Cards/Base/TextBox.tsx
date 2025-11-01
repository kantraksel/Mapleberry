import { Box } from "@mui/material";
import { useEffect, useId, useRef, useState } from "react";

export function TextBox(props: { label: string, value: string }) {
    const [mouseOver, setMouseOver] = useState(false);
    const textArea = useRef<HTMLTextAreaElement>(null);
    const id = useId();

    useEffect(() => {
        const elem = textArea.current!;

        elem.style.height = '0';
        if (elem.value.slice(-1) == '\n') {
            elem.value += ' ';
        }
        const offset = elem.clientWidth < elem.scrollWidth ? 10 : 6;
        elem.style.height = `${elem.scrollHeight + offset}px`;
    }, [ props.value ]);

    const labelColor = mouseOver ? '#90caf9' : '#ffffffb3';
    const borderColor = mouseOver ? '#90caf9' : '#ffffff3b';
    const borderWidth = mouseOver ? '2px' : '1px';

    return (
        <Box sx={{ width: '100%', position: 'relative', display: 'inline-flex', flexDirection: 'column', marginTop: '15px' }}>
            <label id={`${id}-label`} htmlFor={id} style={{ color: labelColor, position: 'absolute', left: 0, top: 0, fontFamily: '"Roboto","Helvetica","Arial",sans-serif', fontWeight: 400, lineHeight: '1.4375em', letterSpacing: '0.00938em', transform: 'translate(17px, -8px)', fontSize: '0.75em' }}>{props.label}</label>
            <Box sx={{ width: '100%', position: 'relative', display: 'inline-flex', alignItems: 'center', fontFamily: '"Roboto","Helvetica","Arial",sans-serif', fontWeight: 400, fontSize: '1rem', lineHeight: '1.4375em', letterSpacing: '0.00938em', color: '#fff', paddingTop: '10px', paddingLeft: '3px', paddingRight: '3px' }}>
                <textarea id={id} ref={textArea} onMouseEnter={() => setMouseOver(true)} onMouseLeave={() => setMouseOver(false)} style={{ width: '100%', resize: 'none', background: 'none', border: 0, font: 'inherit', color: 'currentColor', boxSizing: 'content-box', scrollbarWidth: 'thin', scrollbarColor: 'gray #4C4C4C', outline: 0, paddingLeft: '10px', paddingRight: '10px', paddingBottom: '2px' }} readOnly wrap='off' value={props.value}></textarea>
                <fieldset style={{ position: 'absolute', left: 0, right: 0, top: '-5px', bottom: 0, padding: '0 8px', borderRadius: '4px', borderStyle: 'solid', borderWidth: borderWidth, overflow: 'hidden', borderColor: borderColor, pointerEvents: 'none' }}>
                    <legend style={{ height: '11px', fontSize: '0.75em', visibility: 'hidden' }}><span style={{ paddingLeft: '5px', paddingRight: '5px', visibility: 'visible', opacity: 0 }}>{props.label}</span></legend>
                </fieldset>
            </Box>
        </Box>
    );
}
