/* eslint-env serviceworker */
/**
 * NotifyPress service worker, served at /service-worker.js by Assets::request().
 *
 * The NotifyPress widget registers it when a visitor subscribes. It shows each
 * push the NotifyPress app sends through Firebase Cloud Messaging, reports the
 * view and click back to the app, and opens the notification's link.
 *
 * Self-contained on purpose: it loads no code from elsewhere. Non-WordPress
 * sites import the hosted copy at cdn.notifypress.com/service-worker.js
 * instead, so a behaviour change here belongs there too.
 */

// Must match Api::APP_URL.
const NOTIFYPRESS_API_URL = 'https://app.notifypress.com/api/v1';

self.addEventListener( 'install', () => {
    self.skipWaiting();
} );

self.addEventListener( 'activate', ( event ) => {
    event.waitUntil( self.clients.claim() );
} );

self.addEventListener( 'push', ( event ) => {
    const payload = readPayload( event );

    if ( ! payload ) {
        return;
    }

    const notification = payload.notification || {};
    const data = payload.data || {};
    const title = notification.title || '';

    // Kept on the notification itself, so a click on an older notification
    // still reports and opens that notification rather than the latest one.
    const details = {
        notificationId: data.notificationId || '',
        targetUrl: data.targetUrl || '',
    };

    event.waitUntil(
        Promise.all( [
            self.registration.showNotification( title, {
                body: notification.body,
                icon: data.icon,
                image: data.image,
                requireInteraction: true,
                data: details,
            } ),
            track( details.notificationId, 'track-view', { viewed: true } ),
            notifyOpenPages( {
                title,
                body: notification.body,
                targetUrl: details.targetUrl,
                notificationId: details.notificationId,
            } ),
        ] )
    );
} );

self.addEventListener( 'notificationclick', ( event ) => {
    const details = event.notification.data || {};

    event.notification.close();

    event.waitUntil(
        Promise.all( [
            track( details.notificationId, 'click', { clicked: true } ),
            openTarget( details.targetUrl ),
        ] )
    );
} );

/**
 * Parse the push payload, or return null when it is missing or not JSON.
 *
 * @param {Object} event The push event.
 *
 * @return {Object|null} The FCM message, with notification and data keys.
 */
function readPayload( event ) {
    if ( ! event.data ) {
        return null;
    }

    try {
        return event.data.json();
    } catch ( error ) {
        return null;
    }
}

/**
 * Report a view or click to the NotifyPress app. Failures are ignored: a
 * missed count must never stop the notification from showing or opening.
 *
 * @param {string} notificationId The NotifyPress notification ID.
 * @param {string} endpoint       Either "track-view" or "click".
 * @param {Object} body           The event flag the endpoint expects.
 *
 * @return {Promise<void>} Settles once the request finishes.
 */
function track( notificationId, endpoint, body ) {
    if ( ! notificationId ) {
        return Promise.resolve();
    }

    const url = `${ NOTIFYPRESS_API_URL }/notifications/${ encodeURIComponent(
        notificationId
    ) }/${ endpoint }`;

    return fetch( url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify( {
            ...body,
            browser: getBrowserName(),
            device: getDeviceType(),
        } ),
    } )
        .then( () => {} )
        .catch( () => {} );
}

/**
 * Tell open pages about the push, so the widget's recent list updates live.
 *
 * @param {Object} message The notification summary to post.
 *
 * @return {Promise<void>} Settles once every page has been sent the message.
 */
function notifyOpenPages( message ) {
    return self.clients
        .matchAll( { includeUncontrolled: true } )
        .then( ( windowClients ) => {
            windowClients.forEach( ( client ) => {
                client.postMessage( message );
            } );
        } );
}

/**
 * Focus a tab already showing the notification's link, or open a new one.
 *
 * @param {string} targetUrl The notification's link.
 *
 * @return {Promise<void>} Settles once the tab is focused or opened.
 */
function openTarget( targetUrl ) {
    if ( ! targetUrl ) {
        return Promise.resolve();
    }

    return self.clients
        .matchAll( { type: 'window', includeUncontrolled: true } )
        .then( ( windowClients ) => {
            const match = windowClients.find( ( client ) => {
                return client.url === targetUrl;
            } );

            if ( match ) {
                return match.focus();
            }

            return self.clients.openWindow( targetUrl );
        } );
}

/**
 * Detect the browser name for engagement stats.
 *
 * @return {string} The browser name, e.g. "Chrome" or "Opera".
 */
function getBrowserName() {
    const userAgent = self.navigator.userAgent;
    const match =
        userAgent.match(
            /(opera|opr|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i
        ) || [];

    if ( /trident/i.test( match[ 1 ] ) ) {
        return 'IE';
    }

    if ( 'Chrome' === match[ 1 ] && /\b(OPR|OPERA)\/(\d+)/.test( userAgent ) ) {
        return 'Opera';
    }

    if ( match[ 1 ] ) {
        return match[ 1 ];
    }

    return self.navigator.appName || 'Unknown';
}

/**
 * Detect the device type for engagement stats.
 *
 * @return {string} "Mobile", "Tablet" or "Desktop".
 */
function getDeviceType() {
    const userAgent = self.navigator.userAgent;

    if ( /Mobi|Android|iPhone|iPod/i.test( userAgent ) ) {
        return 'Mobile';
    }

    if ( /Tablet|iPad/i.test( userAgent ) ) {
        return 'Tablet';
    }

    return 'Desktop';
}
