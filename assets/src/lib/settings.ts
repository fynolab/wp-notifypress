import apiFetch from '@wordpress/api-fetch';
import type { NotifyPressSettings, WpPostType } from '../types';

export const getPluginBootstrap = () => window.notifypress || {};
export const getBootstrapSettings = () =>
    ( getPluginBootstrap().settings || {} ) as NotifyPressSettings;
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
