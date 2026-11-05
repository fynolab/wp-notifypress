/**
 * The NotifyPress app this install talks to.
 *
 * Normally https://app.notifypress.com. A site owner can point the plugin at
 * another deployment for testing with the NOTIFYPRESS_APP_URL constant in
 * wp-config.php; PHP validates it (`Api::app_url()`) and passes the result to
 * the admin scripts as `window.notifypress.appUrl`. Mirrors
 * `Fynolab\NotifyPress\Api` on the PHP side.
 */
const DEFAULT_APP_URL = 'https://app.notifypress.com';

/**
 * The app origin from the PHP bootstrap, or the production app when it is
 * missing or not a bare http(s) origin.
 *
 * @return {string} App origin with no trailing slash.
 */
function resolveAppUrl(): string {
    const value =
        typeof window !== 'undefined' ? window.notifypress?.appUrl : undefined;

    if (
        typeof value === 'string' &&
        /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test( value )
    ) {
        return value;
    }

    return DEFAULT_APP_URL;
}

export const APP_URL = resolveAppUrl();
export const API_URL = `${ APP_URL }/api/v1`;
export const BILLING_URL = `${ APP_URL }/user/billing`;
