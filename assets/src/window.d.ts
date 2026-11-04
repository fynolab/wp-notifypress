import type { NotifyPressSettings } from './types';

declare global {
    interface Window {
        notifypress?: {
            /** App origin (Api::app_url()), e.g. https://app.notifypress.com. */
            appUrl?: string;
            settings?: NotifyPressSettings;
            siteUrl?: string;
            restUrl?: string;
            nonce?: string;
            ajaxUrl?: string;
            restNonce?: string;
            /** Block-editor panel bootstrap — only present on editor screens. */
            editor?: {
                siteName?: string;
                siteHost?: string;
                titleMax?: number;
                messageMax?: number;
                postTypes?: string[];
                enabled?: boolean;
                connected?: boolean;
                settingsUrl?: string;
            };
        };
    }

    var notifypress: Window[ 'notifypress' ];
    var ajaxurl: string;
    var wp: {
        data: {
            dispatch: ( store: string ) => {
                createNotice: (
                    status: string,
                    message: string,
                    options?: {
                        isDismissible?: boolean;
                        type?: string;
                    }
                ) => void;
            };
        };
    };
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.png' {
    const src: string;
    export default src;
}

export {};
