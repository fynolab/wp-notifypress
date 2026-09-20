declare module '@wordpress/element' {
    export {
        createRoot,
        render,
        useEffect,
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

    export default function apiFetch<T = unknown>(
        options: ApiFetchOptions
    ): Promise<T>;
}

declare module '@wordpress/components' {
    interface BaseControlProps {
        className?: string;
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
        value?: string;
    }

    interface TextareaControlProps extends TextControlProps {}

    interface SelectControlProps extends BaseControlProps {
        onChange?: ( value: string ) => void;
        options?: Array<{ label: string; value: string }>;
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

    export const Button: import('react').ComponentType<ButtonProps>;
    export const Notice: import('react').ComponentType<NoticeProps>;
    export const PanelBody: import('react').ComponentType<PanelBodyProps>;
    export const SelectControl: import('react').ComponentType<SelectControlProps>;
    export const TextControl: import('react').ComponentType<TextControlProps>;
    export const TextareaControl: import('react').ComponentType<TextareaControlProps>;
    export const ToggleControl: import('react').ComponentType<ToggleControlProps>;
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

    export const PluginSidebar: import('react').ComponentType<PluginSidebarProps>;
}

declare module '@wordpress/data' {
    interface CoreEditorSelector {
        getCurrentPostId: () => number | string | null;
    }

    export function useSelect<T>(
        callback: ( select: ( store: 'core/editor' ) => CoreEditorSelector ) => T
    ): T;
}

declare module 'jquery' {
    const jquery: JQueryStatic;
    export default jquery;
}
