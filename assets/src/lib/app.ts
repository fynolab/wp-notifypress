/**
 * The hosted NotifyPress app.
 *
 * Every install talks to the same app, so these are constants rather than
 * values read from a setting or the localized bootstrap. Mirrors
 * `Fynolab\NotifyPress\Api` on the PHP side.
 */
export const APP_URL = 'https://app.notifypress.com';
export const API_URL = `${ APP_URL }/api/v1`;
export const BILLING_URL = `${ APP_URL }/user/billing`;
