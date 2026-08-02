/**
 * The browser the editor is open in — the notification preview is framed as
 * that browser's own notification chrome, the way subscribers will see it.
 */
export const detectBrowser = (): string => {
    const agent = window.navigator?.userAgent || '';

    if ( /Edg\//.test( agent ) ) {
        return 'Microsoft Edge';
    }

    if ( /OPR\//.test( agent ) ) {
        return 'Opera';
    }

    if ( /Firefox\//.test( agent ) ) {
        return 'Mozilla Firefox';
    }

    if ( /Chrome\//.test( agent ) ) {
        return 'Google Chrome';
    }

    if ( /Safari\//.test( agent ) ) {
        return 'Safari';
    }

    return 'Your browser';
};
