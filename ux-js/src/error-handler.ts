export function handleGlobalError(error: Error) {
    sessionStorage.removeItem('react_error');
    sessionStorage.removeItem('react_error_stack');
    try {
        sessionStorage.setItem('react_error', `${error.name}: ${error.message}`);
    } catch {
    }
    try {
        sessionStorage.setItem('react_error_stack', error.stack ?? 'undefined');
    } catch {
    }

    console.error(error.stack);
    try {
        if (sessionStorage.getItem('no_crash') != 'true') {
            window.alert('Application has crashed and will be restarted.');
            window.location.reload();
        }
    } catch {
    }
}

export function installGlobalErrorHandler() {
    window.onerror = (_ev, _src, _lineno, _colno, error) => {
        handleGlobalError(error ?? new Error('Undefined error'));
    };
}

export function removeGlobalErrorHandler() {
    window.onerror = null;
}
