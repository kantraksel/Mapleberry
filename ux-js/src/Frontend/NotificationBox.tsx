import { Alert, AlertColor, Box, Button, Stack } from "@mui/material";
import { Severity } from "../Backend/Notifications";
import { useEffect, useState } from "react";

function NotificationBox() {
    const [rev, setRev] = useState(0);
    useEffect(() => {
        const onMessage = () => {
            setRev(rev + 1);
        };
        notifications.Update.add(onMessage);
        return () => {
            notifications.Update.delete(onMessage);
        };
    }, [rev]);

    const messages = notifications.getMessages().slice(0, 4).map(msg => {
        let severity: AlertColor, color;
        switch (msg.severity) {
            default:
            case Severity.Info: {
                severity = 'info';
                color = '#fff';
                break;
            }
            case Severity.Success: {
                severity = 'success';
                color = '#fff';
                break;
            }
            case Severity.Warning: {
                severity = 'warning';
                color = '#000';
                break;
            }
            case Severity.Error: {
                severity = 'error';
                color = '#fff';
                break;
            }
        }
        let action, onClose;
        if (msg.answers) {
            const onInteract = (index: number) => {
                notifications.pop(msg.id);
                msg.onAnswer?.call(null, index);
            };
            action = msg.answers.map((answer, index) => {
                return <Button key={index} color='inherit' size='medium' onClick={() => onInteract(index)}>{answer}</Button>
            });
            action = <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '-2px' }}>{action}</Box>
        } else {
            onClose = () => {
                notifications.pop(msg.id);
                msg.onClose?.call(null);
            };
        }

        return <Alert variant='filled' elevation={2} key={msg.id} severity={severity} sx={{ color }} onClose={onClose} action={action}>{msg.text}</Alert>;
    });
    return (
        <Stack direction='column-reverse' spacing={1} sx={{ width: 450, height: 'fit-content', position: 'absolute', right: 8, bottom: 8 }}>
            {messages}
        </Stack>
    );
}
export default NotificationBox;
