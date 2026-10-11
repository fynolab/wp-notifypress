import { useEffect, useRef, useState } from '@wordpress/element';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    BellRing,
    KeyRound,
    Loader2,
    MapPin,
    PartyPopper,
    Settings2,
    ShoppingCart,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPostTypes, getSettings, updateSettings } from '../lib/settings';
import {
    isUnauthorizedError,
    laravelRequest,
    validateConnection,
} from '../lib/api';
import { ui } from '../lib/admin-ui';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import type { ConnectedSite, NotifyPressSettings, WpPostType } from '../types';

const tabs = [
    { key: 'site', label: 'Site Settings', icon: MapPin },
    { key: 'optin', label: 'Opt-in Prompt', icon: BellRing },
    { key: 'welcome', label: 'Welcome Message', icon: PartyPopper },
    { key: 'wordpress', label: 'WordPress Events', icon: Bell },
    { key: 'woocommerce', label: 'WooCommerce', icon: ShoppingCart },
    { key: 'api', label: 'Connect Your Site', icon: KeyRound },
];

interface PromptFormData {
    prompt_title: string;
    prompt_message: string;
    prompt_icon: string;
    prompt_approve_text: string;
    prompt_cancel_text: string;
    prompt_style: string;
    prompt_accent_color: string;
    prompt_position: string;
    prompt_delay_seconds: number;
    prompt_hide_days: number;
}

const promptFormFromSite = ( site: ConnectedSite ): PromptFormData => ( {
    prompt_title: site.prompt_title || '',
    prompt_message: site.prompt_message || '',
    prompt_icon: site.prompt_icon || '',
    prompt_approve_text: site.prompt_approve_text || '',
    prompt_cancel_text: site.prompt_cancel_text || '',
    prompt_style: site.prompt_style || 'card',
    prompt_accent_color: site.prompt_accent_color || '#3858e9',
    prompt_position: site.prompt_position || 'bottom-left',
    prompt_delay_seconds: site.prompt_delay_seconds ?? 0,
    prompt_hide_days: site.prompt_hide_days ?? 7,
} );

// When switching from "all post types" to "specific post types", keep any
// selection already made; otherwise start from every known post type so
// unchecking one is a real change rather than a silent no-op.
const selectedOrAllPostTypeNames = (
    form: NotifyPressSettings,
    postTypes: WpPostType[] | undefined
): string[] =>
    form.postNotificationPostTypes?.length
        ? form.postNotificationPostTypes
        : ( postTypes || [] ).map( ( postType ) => postType.name );

const ACCENT_SWATCHES = [
    '#3858e9',
    '#0d9488',
    '#7c3aed',
    '#dc2626',
    '#ea580c',
    '#ca8a04',
    '#111827',
];

function PromptPreview( {
    style,
    accent,
    title,
    message,
    approveText,
    cancelText,
}: {
    style: string;
    accent: string;
    title: string;
    message: string;
    approveText: string;
    cancelText: string;
} ) {
    const bellIcon = (
        <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );

    return (
        <div
            className="bg-[#f1f5f9] rounded-lg p-3 relative overflow-hidden"
            style={ { minHeight: 90 } }
        >
            <div className="flex items-center gap-1 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                <div className="flex-1 h-2 rounded bg-white/70 ml-1" />
            </div>
            <div className="space-y-1 mb-2">
                <div className="h-1.5 rounded bg-white/50 w-3/4" />
                <div className="h-1.5 rounded bg-white/50 w-1/2" />
            </div>
            { style === 'banner' ? (
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1.5 flex items-center gap-2 shadow-sm">
                    <div
                        className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={ { background: accent } }
                    >
                        { bellIcon }
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[6px] font-bold text-gray-800 leading-tight truncate">
                            { title }
                        </p>
                        <p className="text-[5px] text-gray-500 leading-tight truncate">
                            { message }
                        </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <span className="text-[5px] text-gray-500 border border-gray-200 rounded px-1 py-0.5">
                            { cancelText }
                        </span>
                        <span
                            className="text-[5px] text-white rounded px-1 py-0.5"
                            style={ { background: accent } }
                        >
                            { approveText }
                        </span>
                    </div>
                </div>
            ) : (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-md px-2 py-1.5 w-[85%] flex items-start gap-1.5">
                    { style === 'card' ? (
                        <div
                            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                            style={ { background: accent } }
                        >
                            { bellIcon }
                        </div>
                    ) : null }
                    <div className="flex-1 min-w-0">
                        <p className="text-[6px] font-bold text-gray-800 leading-tight truncate">
                            { title }
                        </p>
                        <p className="text-[5px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
                            { message }
                        </p>
                        <div className="flex gap-1 mt-1">
                            <span className="text-[5px] text-gray-500 border border-gray-200 rounded px-1 py-0.5">
                                { cancelText }
                            </span>
                            <span
                                className="text-[5px] text-white rounded px-1 py-0.5"
                                style={ { background: accent } }
                            >
                                { approveText }
                            </span>
                        </div>
                    </div>
                    <span className="text-gray-300 text-[8px] leading-none flex-shrink-0">
                        ×
                    </span>
                </div>
            ) }
        </div>
    );
}

const emptySettings: NotifyPressSettings = {
    appUrl: '',
    apiToken: '',
    apiKey: '',
    siteKey: '',
    connectionStatus: 'disconnected',
};

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const location = useLocation();
    const navigate = useNavigate();
    // Defaults to Site Settings; only the onboarding/setup flow (which links
    // here with ?tab=api, or completes the OAuth-style connect below) should
    // land on Connect Your Site instead.
    const [ activeTab, setActiveTab ] = useState(
        () => new URLSearchParams( location.search ).get( 'tab' ) || 'site'
    );
    const [ form, setForm ] = useState< NotifyPressSettings | null >( null );
    const [ promptForm, setPromptForm ] = useState< PromptFormData | null >(
        null
    );
    const [ notice, setNotice ] = useState( '' );
    const [ noticeStatus, setNoticeStatus ] = useState( 'success' );
    const [ disconnecting, setDisconnecting ] = useState( false );
    const [ disconnectDialogOpen, setDisconnectDialogOpen ] = useState( false );
    const handledConnectToken = useRef( '' );

    useEffect( () => {
        if ( settingsQuery.data ) {
            setForm( settingsQuery.data );
        }
    }, [ settingsQuery.data ] );

    const hasApiTokenConfigured = Boolean( settingsQuery.data?.apiToken );

    // Prompt settings live on the Laravel site record, not in WP options.
    const currentSiteQuery = useQuery( {
        queryKey: [ 'np-current-site', settingsQuery.data?.apiToken ],
        enabled: hasApiTokenConfigured,
        queryFn: () =>
            laravelRequest< { data?: ConnectedSite } >(
                settingsQuery.data,
                '/sites/current'
            ),
    } );

    useEffect( () => {
        if ( currentSiteQuery.data?.data ) {
            setPromptForm( promptFormFromSite( currentSiteQuery.data.data ) );
        }
    }, [ currentSiteQuery.data ] );

    const postTypesQuery = useQuery( {
        queryKey: [ 'np-post-types' ],
        queryFn: getPostTypes,
    } );

    const saveMutation = useMutation( {
        mutationFn: async ( nextForm: NotifyPressSettings ) => {
            let connectedSite = nextForm.apiToken
                ? nextForm.connectedSite || {}
                : {};
            let connectionStatus = nextForm.apiToken
                ? nextForm.connectionStatus || 'disconnected'
                : 'disconnected';
            let siteKey = nextForm.siteKey || '';

            if ( nextForm.apiToken ) {
                const siteResponse = await validateConnection( nextForm );
                connectedSite = siteResponse.data || {};
                connectionStatus = 'connected';
                siteKey = connectedSite.public_key || siteKey;

                await laravelRequest( nextForm, '/sites/current', {
                    method: 'PUT',
                    body: {
                        site_name: nextForm.siteName || connectedSite.site_name,
                        site_url: nextForm.siteUrl || connectedSite.site_url,
                        enable_geolocation: nextForm.enableGeolocation,
                        remove_powered_by: nextForm.removePoweredBy,
                        welcome_notification_enabled:
                            nextForm.welcomeNotificationEnabled,
                        welcome_notification_title:
                            nextForm.welcomeNotificationTitle || null,
                        welcome_notification_message:
                            nextForm.welcomeNotificationMessage || null,
                        welcome_notification_icon:
                            nextForm.welcomeNotificationIcon || null,
                        welcome_notification_url:
                            nextForm.welcomeNotificationUrl || null,
                        ...( promptForm
                            ? {
                                    prompt_title:
                                        promptForm.prompt_title || null,
                                    prompt_message:
                                        promptForm.prompt_message || null,
                                    prompt_icon:
                                        promptForm.prompt_icon || null,
                                    prompt_approve_text:
                                        promptForm.prompt_approve_text || null,
                                    prompt_cancel_text:
                                        promptForm.prompt_cancel_text || null,
                                    prompt_style: promptForm.prompt_style,
                                    prompt_accent_color:
                                        promptForm.prompt_accent_color,
                                    prompt_position:
                                        promptForm.prompt_position,
                                    prompt_delay_seconds:
                                        promptForm.prompt_delay_seconds,
                                    prompt_hide_days:
                                        promptForm.prompt_hide_days,
                              }
                            : {} ),
                    },
                } );
            }

            return updateSettings( {
                ...nextForm,
                connectedSite,
                connectionStatus,
                siteKey,
                setupCompleted:
                    connectionStatus === 'connected'
                        ? true
                        : nextForm.setupCompleted,
            } );
        },
        onSuccess: ( data ) => {
            setForm( data );
            queryClient.setQueryData( [ 'np-settings' ], data );
            queryClient.invalidateQueries( { queryKey: [ 'np-settings' ] } );
            setNoticeStatus( 'success' );
            setNotice( 'Settings saved.' );
        },
        onError: ( error: Error ) => {
            setNoticeStatus( 'error' );
            setNotice( error.message );
        },
    } );

    const handleDisconnect = () => {
        setDisconnecting( true );
        saveMutation.mutate(
            {
                ...( form ?? emptySettings ),
                apiToken: '',
                apiKey: '',
                siteKey: '',
                connectedSite: {},
                connectionStatus: 'disconnected',
            },
            {
                onSuccess: () => {
                    setNoticeStatus( 'success' );
                    setNotice( 'Site disconnected.' );
                    setDisconnectDialogOpen( false );
                },
                onSettled: () => setDisconnecting( false ),
            }
        );
    };

    useEffect( () => {
        if ( ! form || saveMutation.isPending ) {
            return;
        }

        const params = new URLSearchParams( location.search );
        const accessToken = params.get( 'access_token' );

        if ( ! accessToken || handledConnectToken.current === accessToken ) {
            return;
        }

        handledConnectToken.current = accessToken;

        const siteKey = params.get( 'site_key' ) || form.siteKey || '';

        const nextForm = {
            ...form,
            apiToken: accessToken,
            apiKey: accessToken,
            siteKey,
        };

        setActiveTab( 'api' );
        setForm( nextForm );
        saveMutation.mutate( nextForm, {
            onSuccess: () => {
                navigate( '/settings', { replace: true } );
            },
        } );
    }, [ form, location.search, navigate, saveMutation ] );

    const displayForm = form ?? emptySettings;
    const loading = settingsQuery.isFetching && ! form;

    // Only hide the WooCommerce tab once we positively know it's inactive —
    // wooCommerceActive is undefined only very briefly before settings load,
    // and defaulting to "show" avoids a flash where the tab disappears then
    // reappears.
    const visibleTabs = tabs.filter(
        ( tab ) =>
            tab.key !== 'woocommerce' || displayForm.wooCommerceActive !== false
    );

    useEffect( () => {
        if (
            activeTab === 'woocommerce' &&
            displayForm.wooCommerceActive === false
        ) {
            setActiveTab( 'api' );
        }
    }, [ activeTab, displayForm.wooCommerceActive ] );

    const handleTabChange = ( key ) => {
        setActiveTab( key );
        navigate( key === 'site' ? '/settings' : `/settings?tab=${ key }`, {
            replace: true,
        } );
    };

    // The saved connectionStatus only records that the site was connected
    // once. If the app now rejects the token (revoked, rotated, or mistyped),
    // the live /sites/current check wins.
    const tokenRejected = isUnauthorizedError( currentSiteQuery.error );
    const status = tokenRejected
        ? 'invalid'
        : displayForm.connectionStatus || 'disconnected';
    const connectUrl = `${
        displayForm.appUrl || 'https://app.notifypress.com'
    }/connect?${ new URLSearchParams( {
        callback_uri: `${
            window.notifypress?.siteUrl || window.location.origin
        }/wp-admin/admin.php?page=notifypress`,
        site_name:
            displayForm.siteName ||
            displayForm.connectedSite?.site_name ||
            document.title ||
            'WordPress Site',
        site_url:
            displayForm.siteUrl ||
            displayForm.connectedSite?.site_url ||
            window.notifypress?.siteUrl ||
            window.location.origin,
    } ).toString() }`;

    return (
        <div className={ ui.page }>
            <section className={ ui.toolbar }>
                <div>
                    <span className={ ui.kicker }>Settings</span>
                    <h3 className={ ui.heading }>NotifyPress settings</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Connect this WordPress site with the NotifyPress Laravel
                        app.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link className={ ui.secondaryButton } to="/setup">
                        Setup wizard
                    </Link>
                </div>
            </section>

            <section
                className={ `grid gap-6 transition-opacity duration-500 lg:grid-cols-[280px_minmax(0,1fr)] ${
                    loading ? 'opacity-75' : 'opacity-100'
                }` }
            >
                <aside className="flex flex-col gap-0.5">
                    { visibleTabs.map( ( tab ) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;

                        return (
                            <button
                                className={ `group relative flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-left text-sm font-medium outline-none ring-0 transition-colors duration-150 focus:border-transparent focus:outline-none focus:ring-0 ${
                                    isActive
                                        ? 'bg-background text-foreground'
                                        : 'bg-background text-muted-foreground hover:border-dashed hover:border-border hover:text-foreground'
                                }` }
                                key={ tab.key }
                                onClick={ () => handleTabChange( tab.key ) }
                            >
                                { isActive ? (
                                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                                ) : null }
                                <span
                                    className={ `flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-transparent group-hover:bg-background group-hover:shadow-sm'
                                    }` }
                                >
                                    <Icon size={ 16 } />
                                </span>
                                <span className="truncate">{ tab.label }</span>
                            </button>
                        );
                    } ) }
                </aside>

                <article
                    className={ `${ ui.card } overflow-hidden ${
                        loading ? 'animate-pulse' : ''
                    }` }
                >
                    { notice ? (
                        <Alert
                            className="m-6 mb-0"
                            variant={
                                noticeStatus === 'error'
                                    ? 'destructive'
                                    : 'success'
                            }
                        >
                            <AlertDescription>{ notice }</AlertDescription>
                        </Alert>
                    ) : null }

                    { activeTab === 'api' ? (
                        <div className="grid gap-5 p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <span className={ ui.kicker }>
                                        Connection
                                    </span>
                                    <h3 className="mt-1 text-xl font-bold text-foreground">
                                        Connect Your Site
                                    </h3>
                                </div>
                                { status === 'connected' ? (
                                    <Badge
                                        variant="default"
                                        className="bg-emerald-600 hover:bg-emerald-600"
                                    >
                                        Connected
                                    </Badge>
                                ) : null }
                                { status === 'invalid' ? (
                                    <Badge variant="destructive">
                                        Invalid token
                                    </Badge>
                                ) : null }
                            </div>
                            { status === 'connected' ? (
                                <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <strong className="text-sm font-semibold text-foreground">
                                            This site is connected to
                                            NotifyPress
                                        </strong>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            { displayForm.connectedSite
                                                ?.site_name ||
                                                'Disconnect to unlink this site and stop sending it data.' }
                                        </p>
                                    </div>
                                    <Dialog
                                        open={ disconnectDialogOpen }
                                        onOpenChange={
                                            setDisconnectDialogOpen
                                        }
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="bg-white"
                                                disabled={
                                                    loading || disconnecting
                                                }
                                            >
                                                Disconnect
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Disconnect this site?
                                                </DialogTitle>
                                                <DialogDescription>
                                                    This site will stop
                                                    sending data to
                                                    NotifyPress and the
                                                    subscription prompt will
                                                    no longer be able to
                                                    register subscribers
                                                    until you reconnect.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={ () =>
                                                        setDisconnectDialogOpen(
                                                            false
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    disabled={ disconnecting }
                                                    onClick={
                                                        handleDisconnect
                                                    }
                                                >
                                                    Disconnect
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <strong className="text-sm font-semibold text-foreground">
                                            { status === 'invalid'
                                                ? 'The API token is no longer valid'
                                                : 'Connect without copying an API key' }
                                        </strong>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            { status === 'invalid'
                                                ? 'NotifyPress rejected the saved token. Reconnect this site or paste a new API token below.'
                                                : 'Sign in to NotifyPress and this site will be linked automatically.' }
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        disabled={
                                            loading || saveMutation.isPending
                                        }
                                    >
                                        <a
                                            href={ connectUrl }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            { status === 'invalid'
                                                ? 'Reconnect to NotifyPress App'
                                                : 'Connect to NotifyPress App' }
                                        </a>
                                    </Button>
                                </div>
                            ) }
                            <div className="grid gap-1.5">
                                <Label htmlFor="np-app-url">App URL</Label>
                                <Input
                                    id="np-app-url"
                                    value={ displayForm.appUrl || '' }
                                    onChange={ ( e ) =>
                                        setForm( {
                                            ...displayForm,
                                            appUrl: e.target.value,
                                        } )
                                    }
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="np-api-token">
                                    API token
                                </Label>
                                <Input
                                    id="np-api-token"
                                    value={ displayForm.apiToken || '' }
                                    onChange={ ( e ) => {
                                        const apiToken = e.target.value;

                                        setForm( {
                                            ...displayForm,
                                            apiToken,
                                            apiKey: apiToken,
                                            connectionStatus: apiToken
                                                ? displayForm.connectionStatus
                                                : 'disconnected',
                                            connectedSite: apiToken
                                                ? displayForm.connectedSite
                                                : {},
                                        } );
                                    } }
                                />
                            </div>
                            { displayForm.siteKey ? (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="np-site-key">
                                        Site key (public)
                                    </Label>
                                    <Input
                                        id="np-site-key"
                                        readOnly
                                        value={ displayForm.siteKey }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Used to embed the widget on your site.
                                        Safe to share — it cannot send
                                        notifications.
                                    </p>
                                </div>
                            ) : null }
                        </div>
                    ) : null }

                    { activeTab === 'site' ? (
                        <div className="grid gap-5 p-6 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <span className={ ui.kicker }>
                                    Current site
                                </span>
                                <h3 className="mt-1 text-xl font-bold text-foreground">
                                    Site Settings
                                </h3>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="np-site-name">
                                    Site name
                                </Label>
                                <Input
                                    id="np-site-name"
                                    value={
                                        displayForm.siteName ||
                                        displayForm.connectedSite
                                            ?.site_name ||
                                        ''
                                    }
                                    onChange={ ( e ) =>
                                        setForm( {
                                            ...displayForm,
                                            siteName: e.target.value,
                                        } )
                                    }
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="np-site-url">Site URL</Label>
                                <Input
                                    id="np-site-url"
                                    value={
                                        displayForm.siteUrl ||
                                        displayForm.connectedSite?.site_url ||
                                        ''
                                    }
                                    onChange={ ( e ) =>
                                        setForm( {
                                            ...displayForm,
                                            siteUrl: e.target.value,
                                        } )
                                    }
                                />
                            </div>
                            <div className="flex items-center gap-3 md:col-span-2">
                                <Switch
                                    id="np-enable-geolocation"
                                    checked={ Boolean(
                                        displayForm.enableGeolocation
                                    ) }
                                    onCheckedChange={ ( enableGeolocation ) =>
                                        setForm( {
                                            ...displayForm,
                                            enableGeolocation,
                                        } )
                                    }
                                />
                                <Label
                                    htmlFor="np-enable-geolocation"
                                    className="cursor-pointer"
                                >
                                    Enable geolocation
                                </Label>
                            </div>
                            <div className="flex items-center gap-3 md:col-span-2">
                                <Switch
                                    id="np-remove-powered-by"
                                    checked={ Boolean(
                                        displayForm.removePoweredBy
                                    ) }
                                    onCheckedChange={ ( removePoweredBy ) =>
                                        setForm( {
                                            ...displayForm,
                                            removePoweredBy,
                                        } )
                                    }
                                />
                                <Label
                                    htmlFor="np-remove-powered-by"
                                    className="cursor-pointer"
                                >
                                    Remove powered by link
                                </Label>
                            </div>
                            <div className="flex items-start gap-3 md:col-span-2">
                                <Switch
                                    id="np-pwa-enabled"
                                    checked={ Boolean(
                                        displayForm.pwaEnabled
                                    ) }
                                    onCheckedChange={ ( pwaEnabled ) =>
                                        setForm( {
                                            ...displayForm,
                                            pwaEnabled,
                                        } )
                                    }
                                />
                                <div>
                                    <Label
                                        htmlFor="np-pwa-enabled"
                                        className="cursor-pointer"
                                    >
                                        Enable PWA support
                                    </Label>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Turns your site into an installable
                                        Progressive Web App (adds a web app
                                        manifest and related meta tags).
                                        Push notifications work either way.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null }

                    { activeTab === 'optin' ? (
                        <div className="p-6">
                            <div className="mb-5">
                                <span className={ ui.kicker }>Widget</span>
                                <h3 className="mt-1 text-xl font-bold text-foreground">
                                    Opt-in Prompt
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Customise the subscription prompt shown to
                                    visitors on your site.
                                </p>
                            </div>

                            { ! hasApiTokenConfigured ? (
                                <p className="text-sm text-muted-foreground">
                                    Connect this site to the NotifyPress app
                                    first — prompt settings are stored on your
                                    NotifyPress site.
                                </p>
                            ) : null }

                            { hasApiTokenConfigured && ! promptForm ? (
                                <p className="text-sm text-muted-foreground">
                                    Loading prompt settings…
                                </p>
                            ) : null }

                            { promptForm ? (
                                <div className="flex gap-8">
                                    <div className="flex-1 min-w-0 space-y-7">
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                                <BellRing className="h-3.5 w-3.5" />{ ' ' }
                                                Prompt Content
                                            </h4>

                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label
                                                        htmlFor="np-prompt-title"
                                                        className="text-sm"
                                                    >
                                                        Title
                                                    </Label>
                                                    <span className="text-xs text-muted-foreground">
                                                        {
                                                            promptForm
                                                                .prompt_title
                                                                .length
                                                        }
                                                        /60
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-1">
                                                    Short headline shown at the
                                                    top of the prompt.
                                                </p>
                                                <Input
                                                    id="np-prompt-title"
                                                    value={
                                                        promptForm.prompt_title
                                                    }
                                                    maxLength={ 60 }
                                                    placeholder="Stay in the loop!"
                                                    onChange={ ( e ) =>
                                                        setPromptForm( {
                                                            ...promptForm,
                                                            prompt_title:
                                                                e.target.value,
                                                        } )
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Label
                                                        htmlFor="np-prompt-message"
                                                        className="text-sm"
                                                    >
                                                        Message
                                                    </Label>
                                                    <span className="text-xs text-muted-foreground">
                                                        {
                                                            promptForm
                                                                .prompt_message
                                                                .length
                                                        }
                                                        /200
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-1">
                                                    Explain why visitors should
                                                    subscribe.
                                                </p>
                                                <textarea
                                                    id="np-prompt-message"
                                                    value={
                                                        promptForm.prompt_message
                                                    }
                                                    maxLength={ 200 }
                                                    rows={ 3 }
                                                    placeholder="Would you like to receive notifications on latest updates and offers?"
                                                    onChange={ ( e ) =>
                                                        setPromptForm( {
                                                            ...promptForm,
                                                            prompt_message:
                                                                e.target.value,
                                                        } )
                                                    }
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor="np-prompt-approve"
                                                        className="text-sm"
                                                    >
                                                        Approve Button
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        Text on the allow
                                                        button.
                                                    </p>
                                                    <Input
                                                        id="np-prompt-approve"
                                                        value={
                                                            promptForm.prompt_approve_text
                                                        }
                                                        placeholder="Allow Notifications"
                                                        onChange={ ( e ) =>
                                                            setPromptForm( {
                                                                ...promptForm,
                                                                prompt_approve_text:
                                                                    e.target
                                                                        .value,
                                                            } )
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor="np-prompt-cancel"
                                                        className="text-sm"
                                                    >
                                                        Cancel Button
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        Text on the dismiss
                                                        button.
                                                    </p>
                                                    <Input
                                                        id="np-prompt-cancel"
                                                        value={
                                                            promptForm.prompt_cancel_text
                                                        }
                                                        placeholder="Maybe Later"
                                                        onChange={ ( e ) =>
                                                            setPromptForm( {
                                                                ...promptForm,
                                                                prompt_cancel_text:
                                                                    e.target
                                                                        .value,
                                                            } )
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="np-prompt-icon"
                                                    className="text-sm"
                                                >
                                                    Custom Icon URL
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Optional. Uses default bell
                                                    icon if empty.
                                                </p>
                                                <Input
                                                    id="np-prompt-icon"
                                                    value={
                                                        promptForm.prompt_icon
                                                    }
                                                    type="url"
                                                    placeholder="https://yourdomain.com/icon.png"
                                                    onChange={ ( e ) =>
                                                        setPromptForm( {
                                                            ...promptForm,
                                                            prompt_icon:
                                                                e.target.value,
                                                        } )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                                <Settings2 className="h-3.5 w-3.5" />{ ' ' }
                                                Design &amp; Style
                                            </h4>

                                            <div className="space-y-2">
                                                <Label className="text-sm">
                                                    Layout Style
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Choose how the opt-in prompt
                                                    is displayed to visitors.
                                                </p>
                                                <div className="grid grid-cols-3 gap-3 mt-2">
                                                    { [
                                                        {
                                                            value: 'minimal',
                                                            label: 'Minimal',
                                                            desc: 'Clean browser-native style popup',
                                                        },
                                                        {
                                                            value: 'card',
                                                            label: 'Card',
                                                            desc: 'Floating card with rich content area',
                                                        },
                                                        {
                                                            value: 'banner',
                                                            label: 'Banner',
                                                            desc: 'Full-width bottom bar notification',
                                                        },
                                                    ].map(
                                                        ( {
                                                            value,
                                                            label,
                                                            desc,
                                                        } ) => (
                                                            <button
                                                                key={ value }
                                                                type="button"
                                                                onClick={ () =>
                                                                    setPromptForm(
                                                                        {
                                                                            ...promptForm,
                                                                            prompt_style:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                                className={ `relative rounded-xl border-2 p-3 text-center transition-all ${
                                                                    promptForm.prompt_style ===
                                                                    value
                                                                        ? 'border-primary shadow-sm'
                                                                        : 'border-border hover:border-primary/40'
                                                                }` }
                                                            >
                                                                { promptForm.prompt_style ===
                                                                value ? (
                                                                    <span
                                                                        className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px]"
                                                                        style={ {
                                                                            background:
                                                                                promptForm.prompt_accent_color,
                                                                        } }
                                                                    >
                                                                        ✓
                                                                    </span>
                                                                ) : null }
                                                                <PromptPreview
                                                                    style={
                                                                        value
                                                                    }
                                                                    accent={
                                                                        promptForm.prompt_accent_color ||
                                                                        '#3858e9'
                                                                    }
                                                                    title={
                                                                        promptForm.prompt_title ||
                                                                        'Stay in the loop!'
                                                                    }
                                                                    message={
                                                                        promptForm.prompt_message ||
                                                                        'Would you like to receive notifications on latest updates and offers?'
                                                                    }
                                                                    approveText={
                                                                        promptForm.prompt_approve_text ||
                                                                        'Allow Notifications'
                                                                    }
                                                                    cancelText={
                                                                        promptForm.prompt_cancel_text ||
                                                                        'Maybe Later'
                                                                    }
                                                                />
                                                                <p className="text-xs font-semibold text-foreground mt-2">
                                                                    { label }
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                    { desc }
                                                                </p>
                                                            </button>
                                                        )
                                                    ) }
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm">
                                                    Accent Color
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Applied to buttons and
                                                    highlights in the prompt.
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    { ACCENT_SWATCHES.map(
                                                        ( color ) => (
                                                            <button
                                                                key={ color }
                                                                type="button"
                                                                onClick={ () =>
                                                                    setPromptForm(
                                                                        {
                                                                            ...promptForm,
                                                                            prompt_accent_color:
                                                                                color,
                                                                        }
                                                                    )
                                                                }
                                                                className={ `w-7 h-7 rounded-full border-2 transition-all ${
                                                                    promptForm.prompt_accent_color ===
                                                                    color
                                                                        ? 'border-foreground scale-110'
                                                                        : 'border-transparent'
                                                                }` }
                                                                style={ {
                                                                    background:
                                                                        color,
                                                                } }
                                                                title={ color }
                                                            />
                                                        )
                                                    ) }
                                                    <label
                                                        className="relative w-7 h-7 rounded-full border-2 border-border cursor-pointer overflow-hidden"
                                                        title="Custom color"
                                                    >
                                                        <input
                                                            type="color"
                                                            value={
                                                                promptForm.prompt_accent_color
                                                            }
                                                            onChange={ ( e ) =>
                                                                setPromptForm( {
                                                                    ...promptForm,
                                                                    prompt_accent_color:
                                                                        e.target
                                                                            .value,
                                                                } )
                                                            }
                                                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                        />
                                                        <span
                                                            className="absolute inset-0 rounded-full"
                                                            style={ {
                                                                background:
                                                                    ACCENT_SWATCHES.includes(
                                                                        promptForm.prompt_accent_color
                                                                    )
                                                                        ? 'conic-gradient(red,yellow,green,blue,red)'
                                                                        : promptForm.prompt_accent_color,
                                                            } }
                                                        />
                                                    </label>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {
                                                            promptForm.prompt_accent_color
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm">
                                                    Bell Position
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Which corner of the page the
                                                    notification bell sits in.
                                                </p>
                                                <div className="grid grid-cols-2 gap-3 mt-2 max-w-xs">
                                                    { [
                                                        {
                                                            value: 'bottom-left',
                                                            label: 'Left',
                                                        },
                                                        {
                                                            value: 'bottom-right',
                                                            label: 'Right',
                                                        },
                                                    ].map(
                                                        ( {
                                                            value,
                                                            label,
                                                        } ) => (
                                                            <button
                                                                key={ value }
                                                                type="button"
                                                                onClick={ () =>
                                                                    setPromptForm(
                                                                        {
                                                                            ...promptForm,
                                                                            prompt_position:
                                                                                value,
                                                                        }
                                                                    )
                                                                }
                                                                className={ `rounded-xl border-2 p-3 text-center transition-all ${
                                                                    promptForm.prompt_position ===
                                                                    value
                                                                        ? 'border-primary shadow-sm'
                                                                        : 'border-border hover:border-primary/40'
                                                                }` }
                                                            >
                                                                <div
                                                                    className={ `relative h-14 rounded-md border bg-muted/40 dark:bg-muted/20 flex items-end p-1.5 ${
                                                                        value ===
                                                                        'bottom-right'
                                                                            ? 'justify-end'
                                                                            : 'justify-start'
                                                                    }` }
                                                                >
                                                                    <span
                                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm"
                                                                        style={ {
                                                                            background:
                                                                                promptForm.prompt_accent_color ||
                                                                                '#3858e9',
                                                                        } }
                                                                    >
                                                                        { /* Same paths as the widget's bell in the app's PublicWidgetController. */ }
                                                                        <svg
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth={
                                                                                2
                                                                            }
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            className="w-3.5 h-3.5"
                                                                            aria-hidden="true"
                                                                        >
                                                                            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
                                                                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs font-semibold text-foreground mt-2">
                                                                    { label }
                                                                </p>
                                                            </button>
                                                        )
                                                    ) }
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                                <Settings2 className="h-3.5 w-3.5" />{ ' ' }
                                                Timing &amp; Behaviour
                                            </h4>

                                            <div className="flex items-center gap-3">
                                                <Label className="w-36 flex-shrink-0 text-sm">
                                                    Show prompt
                                                </Label>
                                                <select
                                                    value={
                                                        promptForm.prompt_delay_seconds ===
                                                        0
                                                            ? 'immediate'
                                                            : 'delay'
                                                    }
                                                    onChange={ ( e ) =>
                                                        setPromptForm( {
                                                            ...promptForm,
                                                            prompt_delay_seconds:
                                                                e.target
                                                                    .value ===
                                                                'immediate'
                                                                    ? 0
                                                                    : 5,
                                                        } )
                                                    }
                                                    className="rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                                >
                                                    <option value="immediate">
                                                        Immediately
                                                    </option>
                                                    <option value="delay">
                                                        After N seconds
                                                    </option>
                                                </select>
                                                { promptForm.prompt_delay_seconds >
                                                0 ? (
                                                    <>
                                                        <Input
                                                            type="number"
                                                            min={ 1 }
                                                            max={ 60 }
                                                            value={
                                                                promptForm.prompt_delay_seconds
                                                            }
                                                            onChange={ ( e ) =>
                                                                setPromptForm( {
                                                                    ...promptForm,
                                                                    prompt_delay_seconds:
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) || 1,
                                                                } )
                                                            }
                                                            className="w-20"
                                                        />
                                                        <span className="text-sm text-muted-foreground">
                                                            seconds
                                                        </span>
                                                    </>
                                                ) : null }
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Label
                                                    htmlFor="np-prompt-hide-days"
                                                    className="w-36 flex-shrink-0 text-sm"
                                                >
                                                    Re-show after cancel
                                                </Label>
                                                <Input
                                                    id="np-prompt-hide-days"
                                                    type="number"
                                                    min={ 0 }
                                                    max={ 365 }
                                                    value={
                                                        promptForm.prompt_hide_days
                                                    }
                                                    onChange={ ( e ) =>
                                                        setPromptForm( {
                                                            ...promptForm,
                                                            prompt_hide_days:
                                                                parseInt(
                                                                    e.target
                                                                        .value
                                                                ) || 0,
                                                        } )
                                                    }
                                                    className="w-20"
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    days&nbsp;&nbsp;
                                                    <span className="text-xs">
                                                        (0 = never re-show)
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-64 flex-shrink-0 space-y-4">
                                        <div className="sticky top-6 space-y-4">
                                            <div className="rounded-xl border bg-muted/30 p-4">
                                                <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
                                                    Live Preview
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mb-3">
                                                    Updates as you configure
                                                    above
                                                </p>
                                                <PromptPreview
                                                    style={
                                                        promptForm.prompt_style
                                                    }
                                                    accent={
                                                        promptForm.prompt_accent_color ||
                                                        '#3858e9'
                                                    }
                                                    title={
                                                        promptForm.prompt_title ||
                                                        'Stay in the loop!'
                                                    }
                                                    message={
                                                        promptForm.prompt_message ||
                                                        'Would you like to receive notifications on latest updates and offers?'
                                                    }
                                                    approveText={
                                                        promptForm.prompt_approve_text ||
                                                        'Allow Notifications'
                                                    }
                                                    cancelText={
                                                        promptForm.prompt_cancel_text ||
                                                        'Maybe Later'
                                                    }
                                                />
                                            </div>

                                            <div className="rounded-xl border bg-muted/30 p-4">
                                                <p className="text-xs font-semibold text-foreground mb-3">
                                                    All Styles
                                                </p>
                                                <div className="space-y-3">
                                                    { [
                                                        'minimal',
                                                        'card',
                                                        'banner',
                                                    ].map( ( s ) => (
                                                        <div key={ s }>
                                                            <PromptPreview
                                                                style={ s }
                                                                accent={
                                                                    promptForm.prompt_accent_color ||
                                                                    '#3858e9'
                                                                }
                                                                title={
                                                                    promptForm.prompt_title ||
                                                                    'Stay in the loop!'
                                                                }
                                                                message={
                                                                    promptForm.prompt_message ||
                                                                    'Would you like to receive notifications on latest updates and offers?'
                                                                }
                                                                approveText={
                                                                    promptForm.prompt_approve_text ||
                                                                    'Allow Notifications'
                                                                }
                                                                cancelText={
                                                                    promptForm.prompt_cancel_text ||
                                                                    'Maybe Later'
                                                                }
                                                            />
                                                            <p className="text-[10px] text-muted-foreground capitalize mt-1">
                                                                { s }
                                                            </p>
                                                        </div>
                                                    ) ) }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null }
                        </div>
                    ) : null }

                    { activeTab === 'welcome' ? (
                        <div className="grid gap-5 p-6">
                            <div>
                                <span className={ ui.kicker }>
                                    First impression
                                </span>
                                <h3 className="mt-1 text-xl font-bold text-foreground">
                                    Welcome Message
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Sent automatically the moment a visitor
                                    subscribes, before any campaign goes out.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="np-welcome-enabled"
                                    checked={ Boolean(
                                        displayForm.welcomeNotificationEnabled
                                    ) }
                                    onCheckedChange={ (
                                        welcomeNotificationEnabled
                                    ) =>
                                        setForm( {
                                            ...displayForm,
                                            welcomeNotificationEnabled,
                                        } )
                                    }
                                />
                                <Label
                                    htmlFor="np-welcome-enabled"
                                    className="cursor-pointer"
                                >
                                    Send a welcome notification to new
                                    subscribers
                                </Label>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="np-welcome-title">Title</Label>
                                <Input
                                    id="np-welcome-title"
                                    value={
                                        displayForm.welcomeNotificationTitle ||
                                        ''
                                    }
                                    maxLength={ 60 }
                                    placeholder="Welcome!"
                                    onChange={ ( e ) =>
                                        setForm( {
                                            ...displayForm,
                                            welcomeNotificationTitle:
                                                e.target.value,
                                        } )
                                    }
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="np-welcome-message">
                                    Message
                                </Label>
                                <textarea
                                    id="np-welcome-message"
                                    value={
                                        displayForm.welcomeNotificationMessage ||
                                        ''
                                    }
                                    maxLength={ 200 }
                                    rows={ 3 }
                                    placeholder="Thanks for subscribing — we will keep you posted with our latest updates."
                                    onChange={ ( e ) =>
                                        setForm( {
                                            ...displayForm,
                                            welcomeNotificationMessage:
                                                e.target.value,
                                        } )
                                    }
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                />
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="np-welcome-icon">
                                        Icon URL
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Optional. Uses the default bell icon
                                        if empty.
                                    </p>
                                    <Input
                                        id="np-welcome-icon"
                                        type="url"
                                        value={
                                            displayForm.welcomeNotificationIcon ||
                                            ''
                                        }
                                        placeholder="https://yourdomain.com/icon.png"
                                        onChange={ ( e ) =>
                                            setForm( {
                                                ...displayForm,
                                                welcomeNotificationIcon:
                                                    e.target.value,
                                            } )
                                        }
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="np-welcome-url">
                                        Link URL
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Where subscribers land when they click
                                        the notification.
                                    </p>
                                    <Input
                                        id="np-welcome-url"
                                        type="url"
                                        value={
                                            displayForm.welcomeNotificationUrl ||
                                            ''
                                        }
                                        placeholder="https://yourdomain.com"
                                        onChange={ ( e ) =>
                                            setForm( {
                                                ...displayForm,
                                                welcomeNotificationUrl:
                                                    e.target.value,
                                            } )
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null }

                    { activeTab === 'wordpress' ? (
                        <div className="grid gap-5 p-6">
                            <div>
                                <span className={ ui.kicker }>Automation</span>
                                <h3 className="mt-1 text-xl font-bold text-foreground">
                                    WordPress Events
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="np-post-notification"
                                    checked={ Boolean(
                                        displayForm.postNotificationEnabled
                                    ) }
                                    onCheckedChange={ (
                                        postNotificationEnabled
                                    ) =>
                                        setForm( {
                                            ...displayForm,
                                            postNotificationEnabled,
                                        } )
                                    }
                                />
                                <Label
                                    htmlFor="np-post-notification"
                                    className="cursor-pointer"
                                >
                                    Send notifications for new posts
                                </Label>
                            </div>

                            { displayForm.postNotificationEnabled ? (
                                <div className="space-y-3 rounded-lg border bg-muted/20 p-4 sm:ml-9">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="np-post-notification-limit"
                                            checked={
                                                ! displayForm.postNotificationAllTypes
                                            }
                                            onCheckedChange={ ( limit ) =>
                                                setForm( {
                                                    ...displayForm,
                                                    postNotificationAllTypes:
                                                        ! limit,
                                                    postNotificationPostTypes:
                                                        limit
                                                            ? selectedOrAllPostTypeNames(
                                                                  displayForm,
                                                                  postTypesQuery.data
                                                              )
                                                            : [],
                                                } )
                                            }
                                        />
                                        <Label
                                            htmlFor="np-post-notification-limit"
                                            className="cursor-pointer text-sm"
                                        >
                                            Limit to specific post types
                                        </Label>
                                    </div>

                                    { ! displayForm.postNotificationAllTypes ? (
                                        <div>
                                            <p className="mb-2 text-xs text-muted-foreground">
                                                Choose which public post types
                                                (including custom post types)
                                                should trigger a notification
                                                when published.
                                            </p>
                                            { postTypesQuery.isLoading ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Loading post types…
                                                </p>
                                            ) : null }
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                { (
                                                    postTypesQuery.data || []
                                                ).map( ( postType ) => {
                                                    const selected =
                                                        displayForm.postNotificationPostTypes ||
                                                        [];
                                                    const checked =
                                                        selected.includes(
                                                            postType.name
                                                        );
                                                    const inputId = `np-post-type-${ postType.name }`;

                                                    return (
                                                        <div
                                                            key={
                                                                postType.name
                                                            }
                                                            className="flex items-center gap-2"
                                                        >
                                                            <input
                                                                id={ inputId }
                                                                type="checkbox"
                                                                checked={
                                                                    checked
                                                                }
                                                                onChange={ (
                                                                    e
                                                                ) =>
                                                                    setForm( {
                                                                        ...displayForm,
                                                                        postNotificationPostTypes:
                                                                            e
                                                                                .target
                                                                                .checked
                                                                                ? [
                                                                                      ...selected,
                                                                                      postType.name,
                                                                                  ]
                                                                                : selected.filter(
                                                                                      (
                                                                                          name
                                                                                      ) =>
                                                                                          name !==
                                                                                          postType.name
                                                                                  ),
                                                                    } )
                                                                }
                                                                className="h-4 w-4 rounded border-border"
                                                            />
                                                            <Label
                                                                htmlFor={
                                                                    inputId
                                                                }
                                                                className="cursor-pointer text-sm"
                                                            >
                                                                {
                                                                    postType.label
                                                                }
                                                            </Label>
                                                        </div>
                                                    );
                                                } ) }
                                            </div>
                                        </div>
                                    ) : null }
                                </div>
                            ) : null }
                        </div>
                    ) : null }

                    { activeTab === 'woocommerce' ? (
                        <div className="grid gap-5 p-6">
                            <div>
                                <span className={ ui.kicker }>
                                    Store events
                                </span>
                                <h3 className="mt-1 text-xl font-bold text-foreground">
                                    WooCommerce
                                </h3>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    id="np-wc-order-notification"
                                    checked={ Boolean(
                                        displayForm.wcOrderNotificationEnabled
                                    ) }
                                    onCheckedChange={ (
                                        wcOrderNotificationEnabled
                                    ) =>
                                        setForm( {
                                            ...displayForm,
                                            wcOrderNotificationEnabled,
                                        } )
                                    }
                                />
                                <Label
                                    htmlFor="np-wc-order-notification"
                                    className="cursor-pointer"
                                >
                                    Send notifications for new WooCommerce
                                    orders
                                </Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="np-wc-abandoned-cart-notification"
                                    checked={ Boolean(
                                        displayForm.wcAbandonedCartNotificationEnabled
                                    ) }
                                    onCheckedChange={ (
                                        wcAbandonedCartNotificationEnabled
                                    ) =>
                                        setForm( {
                                            ...displayForm,
                                            wcAbandonedCartNotificationEnabled,
                                        } )
                                    }
                                />
                                <Label
                                    htmlFor="np-wc-abandoned-cart-notification"
                                    className="cursor-pointer"
                                >
                                    Send a reminder notification for abandoned
                                    carts
                                </Label>
                            </div>
                        </div>
                    ) : null }

                    <div className="flex justify-end border-t border-border p-6">
                        <Button
                            disabled={ loading || saveMutation.isPending }
                            onClick={ () => saveMutation.mutate( displayForm ) }
                        >
                            { saveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null }
                            Save settings
                        </Button>
                    </div>
                </article>
            </section>
        </div>
    );
}
