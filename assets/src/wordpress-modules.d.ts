declare module '@wordpress/element' {
    export {
        createRoot,
        lazy,
        render,
        Suspense,
        useCallback,
        useEffect,
        useLayoutEffect,
        useMemo,
        useRef,
        useState,
    } from 'react';
}

declare module '@wordpress/api-fetch' {
    export interface ApiFetchOptions {
        path: string;
        method?: string;
        data?: unknown;
    }

    export default function apiFetch< T = unknown >(
        options: ApiFetchOptions
    ): Promise< T >;
}

declare module '@wordpress/i18n' {
    export function __( text: string, domain?: string ): string;
    export function _x(
        text: string,
        context: string,
        domain?: string
    ): string;
    export function _n(
        single: string,
        plural: string,
        number: number,
        domain?: string
    ): string;
    export function sprintf(
        format: string,
        ...args: Array< string | number >
    ): string;
}

declare module '@wordpress/components' {
    interface BaseControlProps {
        className?: string;
        help?: import('react').ReactNode;
        label?: import('react').ReactNode;
    }

    interface ButtonProps {
        children?: import('react').ReactNode;
        className?: string;
        disabled?: boolean;
        href?: string;
        isBusy?: boolean;
        isPrimary?: boolean;
        onClick?: () => void;
        rel?: string;
        target?: string;
        variant?: string;
    }

    interface TextControlProps extends BaseControlProps {
        maxLength?: number;
        onChange?: ( value: string ) => void;
        placeholder?: string;
        value?: string;
    }

    interface TextareaControlProps extends TextControlProps {
        rows?: number;
    }

    interface CheckboxControlProps extends BaseControlProps {
        checked?: boolean;
        onChange?: ( value: boolean ) => void;
    }

    interface ExternalLinkProps {
        children?: import('react').ReactNode;
        className?: string;
        href?: string;
    }

    interface SelectControlProps extends BaseControlProps {
        onChange?: ( value: string ) => void;
        options?: Array< { label: string; value: string } >;
        value?: string;
    }

    interface ToggleControlProps extends BaseControlProps {
        checked?: boolean;
        onChange?: ( value: boolean ) => void;
    }

    interface NoticeProps {
        children?: import('react').ReactNode;
        isDismissible?: boolean;
        status?: string;
    }

    interface PanelBodyProps {
        children?: import('react').ReactNode;
        initialOpen?: boolean;
    }

    export const Button: import('react').ComponentType< ButtonProps >;
    export const CheckboxControl: import('react').ComponentType< CheckboxControlProps >;
    export const ExternalLink: import('react').ComponentType< ExternalLinkProps >;
    export const Notice: import('react').ComponentType< NoticeProps >;
    export const PanelBody: import('react').ComponentType< PanelBodyProps >;
    export const SelectControl: import('react').ComponentType< SelectControlProps >;
    export const TextControl: import('react').ComponentType< TextControlProps >;
    export const TextareaControl: import('react').ComponentType< TextareaControlProps >;
    export const ToggleControl: import('react').ComponentType< ToggleControlProps >;
}

declare module '@wordpress/plugins' {
    export function registerPlugin(
        name: string,
        settings: {
            render: import('react').ComponentType;
            icon?: string;
        }
    ): void;
}

declare module '@wordpress/edit-post' {
    interface PluginSidebarProps {
        children?: import('react').ReactNode;
        icon?: string;
        name: string;
        title?: string;
    }

    interface PluginDocumentSettingPanelProps {
        children?: import('react').ReactNode;
        className?: string;
        icon?: string;
        name: string;
        title?: string;
    }

    export const PluginSidebar: import('react').ComponentType< PluginSidebarProps >;
    export const PluginDocumentSettingPanel: import('react').ComponentType< PluginDocumentSettingPanelProps >;
}

declare module '@wordpress/editor' {
    export { PluginDocumentSettingPanel } from '@wordpress/edit-post';

    export const store: import('@wordpress/data').StoreDescriptor;
}

declare module '@wordpress/notices' {
    export const store: import('@wordpress/data').StoreDescriptor;
}

declare module '@wordpress/core-data' {
    export function useEntityProp< T = Record< string, unknown > >(
        kind: string,
        name: string,
        prop: string,
        id?: number | string
    ): [ T | undefined, ( value: T ) => void, T | undefined ];
}

declare module '@wordpress/data' {
    // A store can be addressed by name or by its exported descriptor object.
    export type StoreDescriptor = string | { name: string };

    type Selectors = Record< string, ( ...args: never[] ) => unknown >;

    interface Dispatchers {
        createNotice: (
            status: string,
            content: string,
            options?: { isDismissible?: boolean; type?: string }
        ) => void;
        [ action: string ]: ( ...args: never[] ) => unknown;
    }

    export function useSelect< T >(
        callback: ( select: ( store: StoreDescriptor ) => Selectors ) => T,
        deps?: unknown[]
    ): T;

    export function useDispatch( store: StoreDescriptor ): Dispatchers;
}

declare module 'jquery' {
    const jquery: JQueryStatic;
    export default jquery;
}
