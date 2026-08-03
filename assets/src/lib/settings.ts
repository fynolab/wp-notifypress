import apiFetch from '@wordpress/api-fetch';
import type { NotifyPressSettings, WpPostType } from '../types';

export const getPluginBootstrap = () => window.notifypress || {};
export const getBootstrapSettings = () =>
    ( getPluginBootstrap().settings || {} ) as NotifyPressSettings;
/**
 * Marks a settings value as a fingerprint of the API token rather than the
 * token itself. Must match SettingsRepository::MASK_PREFIX.
 *
 * The server never sends the real token to the page — it is a full-access
 * credential — so what arrives here is a stable, non-secret stand-in. It is
 * still safe to use as a "is this site connected?" test and as a react-query
 * cache key, which is all the admin app ever did with it.
 */
export const TOKEN_MASK_PREFIX = 'npmask_';

export const isMaskedToken = ( value?: string ) =>
    Boolean( value && value.startsWith( TOKEN_MASK_PREFIX ) );

export const getApiToken = ( settings?: NotifyPressSettings ) =>
    settings?.apiToken || settings?.apiKey || '';
export const hasApiToken = ( settings?: NotifyPressSettings ) =>
    Boolean( getApiToken( settings ) );

export const getSettings = () =>
    apiFetch< NotifyPressSettings >( { path: '/notifypress/v1/settings' } );

export const updateSettings = ( settings: NotifyPressSettings ) =>
    apiFetch< NotifyPressSettings >( {
        path: '/notifypress/v1/settings',
        method: 'POST',
        data: settings,
    } );

export const getPostTypes = () =>
    apiFetch< WpPostType[] >( { path: '/notifypress/v1/post-types' } );
