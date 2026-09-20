import type { NotifyPressSettings } from './types';

declare global {
    interface Window {
        notifypress?: {
            settings?: NotifyPressSettings;
            siteUrl?: string;
            restUrl?: string;
            nonce?: string;
            defaultAppUrl?: string;
            appUrl?: string;
            apiUrl?: string;
            ajaxUrl?: string;
            restNonce?: string;
        };
    }

    var notifypress: NonNullable<Window['notifypress']>;
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

export {};
