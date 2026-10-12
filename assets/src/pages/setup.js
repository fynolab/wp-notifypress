import { useEffect, useRef, useState } from '@wordpress/element';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowLeft,
    BellRing,
    Check,
    CheckCircle2,
    ExternalLink,
    Globe2,
    Loader2,
    Megaphone,
    PlugZap,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSettings, updateSettings } from '../lib/settings';
import { validateConnection, laravelRequest } from '../lib/api';
import { APP_URL } from '../lib/app';
import { ui } from '../lib/admin-ui';
import LogoMark from '../components/logo-mark';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';

const steps = [
    {
        key: 'connect',
        label: 'Connect account',
        description: 'Link this WordPress site',
        icon: PlugZap,
    },
    {
        key: 'site',
        label: 'Review site',
        description: 'Confirm public details',
        icon: Settings,
    },
    {
        key: 'test',
        label: 'Go live',
        description: 'Start collecting subscribers',
        icon: BellRing,
    },
];

const getSiteUrl = ( settings ) =>
    settings.siteUrl ||
    settings.connectedSite?.site_url ||
    window.notifypress?.siteUrl ||
    window.location.origin;

const getSiteName = ( settings ) =>
    settings.siteName ||
    settings.connectedSite?.site_name ||
    document.title ||
    'WordPress Site';

const getConnectUrl = ( settings ) =>
    `${ APP_URL }/connect?${ new URLSearchParams( {
        callback_uri: `${
            window.notifypress?.siteUrl || window.location.origin
        }/wp-admin/admin.php?page=notifypress#/setup`,
        site_name: getSiteName( settings ),
        site_url: getSiteUrl( settings ),
    } ).toString() }`;

const getStepClassName = ( isActive ) =>
    `rounded-lg border bg-card p-4 shadow-sm transition-colors ${
        isActive ? 'border-primary ring-2 ring-primary/10' : 'border-border'
    }`;

const getStepIconClassName = ( isDone, isActive ) => {
    if ( isDone ) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if ( isActive ) {
        return 'border-primary bg-primary text-primary-foreground';
    }

    return 'border-border bg-muted/40 text-muted-foreground';
};

function SetupSteps( { activeStep, connected } ) {
    const activeIndex = Math.max(
        0,
        steps.findIndex( ( step ) => step.key === activeStep )
    );

    return (
        <div className="relative mx-auto max-w-5xl pb-8">
            <div className="absolute left-10 right-10 top-7 hidden h-px bg-border md:block" />
            <div
                className="absolute left-10 top-7 hidden h-px bg-primary transition-all md:block"
                style={ {
                    width: `${ Math.min(
                        100,
                        ( activeIndex / Math.max( 1, steps.length - 1 ) ) * 100
                    ) }%`,
                } }
            />
            <div className="relative grid gap-3 md:grid-cols-3">
                { steps.map( ( step, index ) => {
                    const Icon = step.icon;
                    const isDone =
                        index < activeIndex || ( connected && index === 0 );
                    const isActive = activeStep === step.key;

                    return (
                        <div
                            className={ getStepClassName( isActive ) }
                            key={ step.key }
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={ `grid h-9 w-9 shrink-0 place-items-center rounded-full border ${ getStepIconClassName(
                                        isDone,
                                        isActive
                                    ) }` }
                                >
                                    { isDone ? (
                                        <Check size={ 16 } />
                                    ) : (
                                        <Icon size={ 16 } />
                                    ) }
                                </span>
                                <div>
                                    <div className="text-sm font-semibold text-foreground">
                                        { step.label }
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        { step.description }
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                } ) }
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="grid min-h-screen place-items-center p-6">
            <section className="w-full max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow">
                <h3 className="text-lg font-semibold text-foreground">
                    Loading setup
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Preparing your NotifyPress setup wizard.
                </p>
            </section>
        </div>
    );
}

function SetupHeader() {
    return (
        <div className="mx-auto mb-8 max-w-3xl text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <LogoMark className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                NotifyPress setup
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
                Set up NotifyPress
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
                Connect your account, confirm how this site appears to
                subscribers, and start collecting push subscribers from
                WordPress.
            </p>
        </div>
    );
}

function StatusTile( { icon: Icon, label, value, tone = 'default' } ) {
    const toneClasses = {
        default: 'border-border bg-muted/30 text-foreground',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
    };
    const toneClass = toneClasses[ tone ] || toneClasses.default;

    return (
        <div className={ `rounded-lg border p-4 ${ toneClass }` }>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
                <Icon className="h-4 w-4" />
                { label }
            </div>
            <div className="mt-2 text-sm font-semibold">{ value }</div>
        </div>
    );
}

function OptionRow( { checked, description, label, onChange, icon: Icon } ) {
    const id = `np-option-${ label
        .toLowerCase()
        .replace( /[^a-z0-9]+/g, '-' ) }`;

    return (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background text-primary shadow-sm">
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={ checked }
                            id={ id }
                            onCheckedChange={ onChange }
                        />
                        <Label className="cursor-pointer" htmlFor={ id }>
                            { label }
                        </Label>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        { description }
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SetupPage() {
    const queryClient = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();
    const handledConnectToken = useRef( '' );
    const [ activeStep, setActiveStep ] = useState( 'connect' );
    const [ notice, setNotice ] = useState( null );
    const [ form, setForm ] = useState( null );

    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    useEffect( () => {
        if ( settingsQuery.data ) {
            setForm( settingsQuery.data );
            setActiveStep(
                settingsQuery.data.apiToken || settingsQuery.data.apiKey
                    ? 'site'
                    : 'connect'
            );
        }
    }, [ settingsQuery.data ] );

    const saveMutation = useMutation( {
        mutationFn: async ( nextForm ) => {
            let connectedSite = nextForm.connectedSite || {};
            let connectionStatus = nextForm.connectionStatus || 'disconnected';

            if ( nextForm.apiToken || nextForm.apiKey ) {
                const siteResponse = await validateConnection( nextForm );
                connectedSite = siteResponse.data || {};
                connectionStatus = 'connected';

                await laravelRequest( nextForm, '/sites/current', {
                    method: 'PUT',
                    body: {
                        site_name: nextForm.siteName || connectedSite.site_name,
                        site_url: nextForm.siteUrl || connectedSite.site_url,
                        remove_powered_by: nextForm.removePoweredBy,
                    },
                } );
            }

            return updateSettings( {
                ...nextForm,
                connectedSite,
                connectionStatus,
            } );
        },
        onSuccess: ( data ) => {
            setForm( data );
            queryClient.invalidateQueries( { queryKey: [ 'np-settings' ] } );
            setNotice( { status: 'success', message: 'Setup details saved.' } );
        },
        onError: ( error ) =>
            setNotice( { status: 'error', message: error.message } ),
    } );

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

        setForm( nextForm );
        setActiveStep( 'site' );
        saveMutation.mutate( nextForm, {
            onSuccess: () => navigate( '/setup', { replace: true } ),
        } );
    }, [ form, location.search, navigate, saveMutation ] );

    if ( ! form ) {
        return <EmptyState />;
    }

    const connected = Boolean(
        ( form.apiToken || form.apiKey ) &&
            form.connectionStatus === 'connected'
    );
    const promptEnabled = Boolean( form.enabled );
    const siteUrl = getSiteUrl( form );

    const completeSetup = () => {
        saveMutation.mutate(
            { ...form, setupCompleted: true },
            {
                onSuccess: () => navigate( '/dashboard' ),
            }
        );
    };

    return (
        <div className="min-h-screen px-4 py-10 md:px-8">
            <div className="mx-auto max-w-6xl">
                <SetupHeader />

                <SetupSteps activeStep={ activeStep } connected={ connected } />

                { notice ? (
                    <div className="mx-auto mb-5 max-w-4xl">
                        <Alert
                            variant={
                                notice.status === 'error'
                                    ? 'destructive'
                                    : 'success'
                            }
                        >
                            <AlertDescription>
                                { notice.message }
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : null }

                <div className="mx-auto max-w-4xl rounded-xl bg-card shadow">
                    { activeStep === 'connect' ? (
                        <Card className="border-border bg-card shadow-none">
                            <CardHeader>
                                <span className={ ui.kicker }>Step 1</span>
                                <CardTitle className="text-2xl">
                                    Connect your NotifyPress account
                                </CardTitle>
                                <CardDescription>
                                    Sign in to NotifyPress, choose this site,
                                    and come back with the connection saved
                                    automatically.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                                    <div className="rounded-lg border border-border bg-muted/20 p-5">
                                        <div className="flex items-start gap-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                                                <PlugZap className="h-5 w-5" />
                                            </span>
                                            <div>
                                                <h3 className="text-base font-semibold text-foreground">
                                                    Connect without copying an
                                                    API token
                                                </h3>
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    NotifyPress will create or
                                                    reuse the matching app site,
                                                    sync the site token, and
                                                    bring you back here to
                                                    finish setup.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <Button
                                                asChild
                                                className={ ui.primaryButton }
                                            >
                                                <a
                                                    href={ getConnectUrl(
                                                        form
                                                    ) }
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    Connect NotifyPress
                                                    <ExternalLink size={ 15 } />
                                                </a>
                                            </Button>
                                            <Button
                                                className={ ui.secondaryButton }
                                                onClick={ () =>
                                                    navigate(
                                                        '/settings?tab=api'
                                                    )
                                                }
                                                type="button"
                                            >
                                                Use API token instead
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-border bg-background p-5">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            What happens next
                                        </h3>
                                        <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                                            <div className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                                Site identity is matched in the
                                                app.
                                            </div>
                                            <div className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                                WordPress stores the site token.
                                            </div>
                                            <div className="flex gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                                You review the public prompt
                                                settings.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null }

                    { activeStep === 'site' ? (
                        <Card className="border-border bg-card shadow-none">
                            <CardHeader>
                                <span className={ ui.kicker }>Step 2</span>
                                <CardTitle className="text-2xl">
                                    Review site details
                                </CardTitle>
                                <CardDescription>
                                    These details control how the site appears
                                    in NotifyPress and how the subscription
                                    prompt behaves for visitors.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <label
                                        className="space-y-2"
                                        htmlFor="notifypress-site-name"
                                    >
                                        <span className={ ui.label }>
                                            Site name
                                        </span>
                                        <Input
                                            className="h-11 bg-background"
                                            id="notifypress-site-name"
                                            value={ getSiteName( form ) }
                                            onChange={ ( event ) =>
                                                setForm( {
                                                    ...form,
                                                    siteName:
                                                        event.target.value,
                                                } )
                                            }
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Used in your NotifyPress dashboard
                                            and subscriber-facing prompt.
                                        </p>
                                    </label>
                                    <label
                                        className="space-y-2"
                                        htmlFor="notifypress-site-url"
                                    >
                                        <span className={ ui.label }>
                                            Site URL
                                        </span>
                                        <Input
                                            className="h-11 bg-background"
                                            id="notifypress-site-url"
                                            value={ siteUrl }
                                            onChange={ ( event ) =>
                                                setForm( {
                                                    ...form,
                                                    siteUrl: event.target.value,
                                                } )
                                            }
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            The public URL visitors will return
                                            to when they engage with
                                            notifications.
                                        </p>
                                    </label>
                                    <div className="md:col-span-2">
                                        <OptionRow
                                            icon={ ShieldCheck }
                                            label="Remove powered by link"
                                            description="Hide the NotifyPress attribution from the public prompt when your account allows white labeling."
                                            checked={ Boolean(
                                                form.removePoweredBy
                                            ) }
                                            onChange={ ( removePoweredBy ) =>
                                                setForm( {
                                                    ...form,
                                                    removePoweredBy,
                                                } )
                                            }
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardContent className="flex flex-wrap justify-end gap-2 border-t border-border pt-6">
                                <Button
                                    className={ ui.secondaryButton }
                                    onClick={ () => setActiveStep( 'connect' ) }
                                    type="button"
                                >
                                    <ArrowLeft size={ 15 } />
                                    Back
                                </Button>
                                <Button
                                    className={ ui.primaryButton }
                                    disabled={ saveMutation.isPending }
                                    onClick={ () =>
                                        saveMutation.mutate( form, {
                                            onSuccess: () =>
                                                setActiveStep( 'test' ),
                                        } )
                                    }
                                    type="button"
                                >
                                    { saveMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : null }
                                    Save and continue
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null }

                    { activeStep === 'test' ? (
                        <Card className="border-border bg-card shadow-none">
                            <CardHeader>
                                <span className={ ui.kicker }>Step 3</span>
                                <CardTitle className="text-2xl">
                                    Ready to use NotifyPress
                                </CardTitle>
                                <CardDescription>
                                    Your site is connected. Open the public site
                                    to check the subscriber prompt, then head to
                                    the dashboard to monitor subscribers and
                                    send your first campaign.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 md:grid-cols-3">
                                    <StatusTile
                                        icon={ PlugZap }
                                        label="Account"
                                        value={
                                            connected
                                                ? 'Connected'
                                                : 'Needs connection'
                                        }
                                        tone={
                                            connected ? 'success' : 'warning'
                                        }
                                    />
                                    <StatusTile
                                        icon={ Megaphone }
                                        label="Prompt"
                                        value={
                                            promptEnabled
                                                ? 'Enabled'
                                                : 'Disabled'
                                        }
                                        tone={
                                            promptEnabled
                                                ? 'success'
                                                : 'warning'
                                        }
                                    />
                                    <StatusTile
                                        icon={ Globe2 }
                                        label="Site"
                                        value="Ready"
                                        tone="success"
                                    />
                                </div>

                                { ! promptEnabled ? (
                                    <div className="mt-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                Subscription prompt is disabled
                                            </h3>
                                            <p className="mt-1 text-sm leading-6">
                                                Finish setup, then open Settings
                                                to enable the public prompt
                                                before you start collecting
                                                subscribers.
                                            </p>
                                        </div>
                                    </div>
                                ) : null }

                                <div className="mt-5 rounded-lg border border-border bg-muted/20 p-5">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Recommended next steps
                                    </h3>
                                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                                        <div className="flex gap-2">
                                            <span className="mt-0.5 font-semibold text-primary">
                                                1
                                            </span>
                                            Open your site and subscribe from
                                            this browser.
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="mt-0.5 font-semibold text-primary">
                                                2
                                            </span>
                                            Watch the subscriber appear in
                                            NotifyPress.
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="mt-0.5 font-semibold text-primary">
                                                3
                                            </span>
                                            Send a test campaign when ready.
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardContent className="flex flex-wrap justify-end gap-2 border-t border-border pt-6">
                                <Button
                                    asChild
                                    className={ ui.secondaryButton }
                                >
                                    <a
                                        href={ siteUrl || '/' }
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        Open site
                                        <ExternalLink size={ 15 } />
                                    </a>
                                </Button>
                                <Button
                                    className={ ui.secondaryButton }
                                    onClick={ () => setActiveStep( 'site' ) }
                                    type="button"
                                >
                                    <ArrowLeft size={ 15 } />
                                    Back
                                </Button>
                                <Button
                                    className={ ui.primaryButton }
                                    disabled={ saveMutation.isPending }
                                    onClick={ completeSetup }
                                    type="button"
                                >
                                    { saveMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : null }
                                    Finish setup
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null }
                </div>
            </div>
        </div>
    );
}
