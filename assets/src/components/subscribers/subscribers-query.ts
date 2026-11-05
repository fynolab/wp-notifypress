/**
 * Query parameters for the Subscribers list, shared by the page and the
 * sidebar hover prefetch (lib/prefetch-nav.ts) so both fetch the same page and
 * share one cache entry.
 *
 * Newest registrations first, the same order as the app's Subscribers page.
 * `sort=created_at` also keeps the query on the site's created-at index; the
 * API's default id order has to sort every subscriber of the site first.
 */
export const SUBSCRIBERS_LIST_PARAMS = { sort: 'created_at' };
