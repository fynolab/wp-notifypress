import type { NotifyPressSettings } from './types';

declare global {
    interface Window {
        notifypress?: {
            settings?: NotifyPressSettings;
            siteUrl?: string;
            restUrl?: string;
            nonce?: string;
            ajaxUrl?: string;
            restNonce?: string;
        };
        notifypressGlobal?: {
            ajaxUrl: string;
            nonce: string;
        };
    }

    var notifypress: Window['notifypress'];
    var notifypressGlobal: NonNullable<Window['notifypressGlobal']>;
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
