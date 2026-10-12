/**
 * Mirrors the visitor's NotifyPress subscription token into WordPress.
 *
 * The NotifyPress widget keeps the token in localStorage. This posts it to
 * admin-ajax once per browser session, so WooCommerce order confirmations and
 * cart reminders can be addressed to this one subscriber. Configured by
 * window.notifypressTokenBridge, printed by Services\WC\TokenBridge.
 */
( function () {
    const config = window.notifypressTokenBridge;

    if ( ! config ) {
        return;
    }

    const TOKEN_KEY = 'notifypress-SubscriptionToken';
    const SYNCED_KEY = 'notifypress-TokenSynced';
    const RETRIES = 5;
    const RETRY_DELAY = 2000;

    let attempts = 0;

    function readToken() {
        try {
            return window.localStorage.getItem( TOKEN_KEY ) || '';
        } catch ( error ) {
            return '';
        }
    }

    function readSynced() {
        try {
            return window.sessionStorage.getItem( SYNCED_KEY ) || '';
        } catch ( error ) {
            return '';
        }
    }

    function markSynced( token ) {
        try {
            window.sessionStorage.setItem( SYNCED_KEY, token );
        } catch ( error ) {
            // Private browsing with storage disabled: the token still reached
            // the server, we just cannot remember that for the next pageview.
        }
    }

    function sync() {
        attempts += 1;

        const token = readToken();

        if ( ! token ) {
            if ( attempts < RETRIES ) {
                window.setTimeout( sync, RETRY_DELAY );
            }

            return;
        }

        if ( token === readSynced() ) {
            return;
        }

        const body = new window.FormData();

        body.append( 'action', config.action );
        body.append( 'nonce', config.nonce );
        body.append( 'token', token );

        window
            .fetch( config.ajaxUrl, {
                method: 'POST',
                credentials: 'same-origin',
                body,
            } )
            .then( function ( response ) {
                if ( response.ok ) {
                    markSynced( token );
                }
            } )
            .catch( function () {
                // Offline or blocked: the next pageview tries again.
            } );
    }

    if ( 'loading' === document.readyState ) {
        document.addEventListener( 'DOMContentLoaded', sync );
    } else {
        sync();
    }
} )();
