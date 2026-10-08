import { useEffect, useState } from '@wordpress/element';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Copy,
    Edit3,
    MoreVertical,
    Pause,
    Play,
    Plus,
    Square,
    Trash2,
    Workflow,
} from 'lucide-react';
import { laravelRequest } from '../lib/api';
import { getSettings } from '../lib/settings';
import { ui } from '../lib/admin-ui';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import PaidFeatureOverlay from '../components/paid-feature-overlay';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import AutomationCanvas from './automations-canvas';
import type {
    Automation,
    AutomationStep,
    AutomationTrigger,
    LaravelCollection,
    LaravelResource,
    NotifyPressSettings,
} from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AutomationFormData {
    name: string;
    description: string;
    trigger_type: AutomationTrigger;
    trigger_config: Record< string, unknown >;
}

interface TagOption { id: number; name: string }

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRIGGERS: Array< { value: AutomationTrigger; label: string } > = [
    { value: 'subscriber_created', label: 'Subscriber Joins' },
    { value: 'custom_event', label: 'Custom Event' },
];

// ── List view ─────────────────────────────────────────────────────────────────

const statusDotColors: Record< string, string > = {
    draft: 'bg-muted-foreground',
    active: 'bg-emerald-600',
    paused: 'bg-yellow-500',
    archived: 'bg-red-500',
};

function pct( part: number, total: number ): string {
    if ( ! total ) {
        return '0%';
    }

    return `${ Math.round( ( part / total ) * 100 ) }%`;
}

function AutomationsList( { settings }: { settings: NotifyPressSettings } ) {
    const queryClient = useQueryClient();
    const [ search, setSearch ] = useState( '' );
    const [ statusFilter, setStatusFilter ] = useState( 'all' );

    const listQuery = useQuery( {
        queryKey: [ 'np-automations', settings.apiToken ],
        queryFn: () =>
            laravelRequest< {
                data: Automation[];
                total: number;
                isPaidUser?: boolean;
            } >( settings, '/automations' ),
    } );

    const invalidate = () =>
        queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );

    // Warms the Messages tab's default (unfiltered) query on hover/focus, so
    // the query key must match `automations-messages.tsx`'s `listQuery`
    // exactly for its default filter state — otherwise this prefetch is
    // wasted and the tab still shows a loading state on click.
    const prefetchMessages = () =>
        queryClient.prefetchQuery( {
            queryKey: [
                'np-automation-messages',
                settings.apiToken,
                '',
                'newest',
                'all',
                'all',
            ],
            queryFn: () =>
                laravelRequest( settings, '/automations/messages', {
                    query: { sort: 'newest' },
                } ),
        } );

    const activateMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/activate`, { method: 'POST' } ),
        onSuccess: invalidate,
        // The app refuses an automation that cannot run yet (no steps, or a Send step
        // without a message); say why instead of leaving the click with no effect.
        onError: ( err: Error ) => toast.error( err.message ),
    } );

    const pauseMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/pause`, { method: 'POST' } ),
        onSuccess: invalidate,
    } );

    const archiveMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/archive`, { method: 'POST' } ),
        onSuccess: invalidate,
    } );

    const duplicateMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/duplicate`, { method: 'POST' } ),
        onSuccess: invalidate,
    } );

    const deleteMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }`, { method: 'DELETE' } ),
        onSuccess: invalidate,
    } );

    const automations = listQuery.data?.data ?? [];
    const rawCounts = automations.reduce< Record< string, number > >(
        ( acc, a ) => {
            acc[ a.status ] = ( acc[ a.status ] ?? 0 ) + 1;
            return acc;
        },
        {}
    );
    const statusCounts = {
        all: automations.length,
        active: rawCounts.active ?? 0,
        paused: rawCounts.paused ?? 0,
        inactive: rawCounts.draft ?? 0,
    };
    const visibleAutomations = automations
        .filter( ( a ) =>
            statusFilter === 'all' ? true : a.status === statusFilter
        )
        .filter( ( a ) =>
            search.trim()
                ? a.name.toLowerCase().includes( search.trim().toLowerCase() )
                : true
        );

    const handleStop = ( id: number ) => {
        if (
            ! window.confirm(
                'Stop this automation? This cannot be undone — subscribers already enrolled will finish, but no new ones will be enrolled.'
            )
        ) {
            return;
        }

        archiveMutation.mutate( id );
    };

    const handleDelete = ( id: number ) => {
        if ( ! window.confirm( 'Delete this automation? This cannot be undone.' ) ) {
            return;
        }

        deleteMutation.mutate( id );
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Automations
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Trigger-based notification sequences that run
                        automatically.
                    </p>
                </div>
                <Button asChild>
                    <Link to="/automations/templates">
                        <Plus className="mr-2 h-4 w-4" />
                        Create an automation
                    </Link>
                </Button>
            </div>

            <PaidFeatureOverlay
                isPaidUser={ listQuery.data?.isPaidUser ?? true }
                featureName="Automations"
                description="Automation workflows are available on Starter plans and above. Upgrade to send notifications automatically when subscribers join or take an action."
            >
            <div className="space-y-6">
            <div className="flex items-center gap-2 border-b">
                <Link
                    to="/automations"
                    className="border-b-2 border-primary px-3 py-2 text-sm font-medium"
                >
                    Workflows
                </Link>
                <Link
                    to="/automations/messages"
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    onMouseEnter={ prefetchMessages }
                    onFocus={ prefetchMessages }
                >
                    Messages
                </Link>
            </div>

            <Tabs value={ statusFilter } onValueChange={ setStatusFilter }>
                <TabsList>
                    <TabsTrigger value="all">All { statusCounts.all }</TabsTrigger>
                    <TabsTrigger value="active">
                        Active { statusCounts.active }
                    </TabsTrigger>
                    <TabsTrigger value="paused">
                        Paused { statusCounts.paused }
                    </TabsTrigger>
                    <TabsTrigger value="draft">
                        Inactive { statusCounts.inactive }
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
                <Input
                    value={ search }
                    onChange={ ( event ) => setSearch( event.target.value ) }
                    placeholder="Search for an automation"
                    className="max-w-sm"
                />
            </div>

            <div className="flex overflow-x-auto sm:justify-center" />

            { ! listQuery.isLoading && automations.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Workflow className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-medium">No automations yet</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-6">
                            Create your first automation to send notifications
                            automatically when subscribers join.
                        </p>
                        <Button asChild>
                            <Link to="/automations/templates">
                                <Plus className="mr-2 h-4 w-4" />
                                Create an automation
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Active now</TableHead>
                                <TableHead className="text-right">Started</TableHead>
                                <TableHead className="text-right">Finished</TableHead>
                                <TableHead className="text-right">Suspended</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            { visibleAutomations.map( ( automation ) => (
                                <TableRow key={ automation.id }>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{ automation.name }</p>
                                            <p className="text-xs text-muted-foreground">
                                                #{ automation.id } · Last edited{ ' ' }
                                                { new Date(
                                                    automation.updated_at ?? ''
                                                ).toLocaleString() }
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                                            <span
                                                className={ `h-2 w-2 rounded-full ${
                                                    statusDotColors[ automation.status ] ?? ''
                                                }` }
                                            />
                                            { automation.status === 'draft'
                                                ? 'Inactive'
                                                : automation.status }
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="text-sm font-medium">
                                            { automation.active_count ?? 0 }
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            { pct(
                                                automation.active_count ?? 0,
                                                automation.started_count ?? 0
                                            ) }
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="text-sm font-medium">
                                            { automation.started_count ?? 0 }
                                        </div>
                                        <div className="text-xs text-muted-foreground">100%</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="text-sm font-medium">
                                            { automation.finished_count ?? 0 }
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            { pct(
                                                automation.finished_count ?? 0,
                                                automation.started_count ?? 0
                                            ) }
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="text-sm font-medium">
                                            { automation.suspended_count ?? 0 }
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            { pct(
                                                automation.suspended_count ?? 0,
                                                automation.started_count ?? 0
                                            ) }
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            { automation.status !== 'archived' ? (
                                                automation.status === 'active' ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={ () =>
                                                            pauseMutation.mutate( automation.id )
                                                        }
                                                        title="Pause"
                                                    >
                                                        <Pause className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={ () =>
                                                            activateMutation.mutate( automation.id )
                                                        }
                                                        title="Activate"
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                )
                                            ) : null }
                                            { automation.status !== 'archived' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={ () => handleStop( automation.id ) }
                                                    title="Stop"
                                                >
                                                    <Square className="h-4 w-4" />
                                                </Button>
                                            ) : null }
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            to={ `/automations/${ automation.id }/edit` }
                                                        >
                                                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={ () =>
                                                            duplicateMutation.mutate( automation.id )
                                                        }
                                                    >
                                                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={ () => handleDelete( automation.id ) }
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) ) }
                        </TableBody>
                    </Table>
                </Card>
            ) }

            <div className="flex overflow-x-auto sm:justify-center" />
            </div>
            </PaidFeatureOverlay>
        </div>
    );
}

// ── Create / Edit view ────────────────────────────────────────────────────────

export interface AutomationFormInitial {
    name: string;
    description: string;
    trigger_type: AutomationTrigger;
    trigger_config: Record< string, unknown >;
    steps: AutomationStep[];
}

export function AutomationForm( {
    settings,
    automationId,
    initial,
}: {
    settings: NotifyPressSettings;
    automationId?: string;
    initial?: AutomationFormInitial;
} ) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = Boolean( automationId );

    const [ form, setForm ] = useState< AutomationFormData >( {
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        trigger_type: initial?.trigger_type ?? 'subscriber_created',
        trigger_config: initial?.trigger_config ?? {},
    } );
    const [ steps, setSteps ] = useState< AutomationStep[] >(
        initial?.steps ?? []
    );
    const [ error, setError ] = useState( '' );

    // Fetch existing automation for edit
    const automationQuery = useQuery( {
        queryKey: [ 'np-automation', automationId ],
        enabled: isEdit,
        queryFn: () =>
            laravelRequest< LaravelResource< Automation > >(
                settings,
                `/automations/${ automationId }`
            ),
    } );

    useEffect( () => {
        const a = automationQuery.data?.data;

        if ( ! a ) {
            return;
        }

        setForm( {
            name: a.name,
            description: a.description ?? '',
            trigger_type: a.trigger_type,
            trigger_config: a.trigger_config ?? {},
        } );
        setSteps(
            ( a.steps ?? [] ).map( ( s, i ) => ( {
                ...s,
                nodeId: `step-db-${ s.id ?? i }`,
            } ) )
        );
    }, [ automationQuery.data ] );

    // Automation messages for send_notification steps — same source as the
    // Messages library (purpose = automation_message), not campaign drafts.
    const messagesQuery = useQuery( {
        queryKey: [ 'np-automation-messages-options', settings.apiToken ],
        queryFn: () =>
            laravelRequest< { data: Array< { message_id: number; title: string } > } >(
                settings,
                '/automations/messages'
            ),
    } );

    const notifications = ( messagesQuery.data?.data ?? [] ).map( ( m ) => ( {
        id: Number( m.message_id ),
        title: m.title ?? String( m.message_id ),
    } ) );

    // Tags for add_tag steps.
    const tagsQuery = useQuery( {
        queryKey: [ 'np-tags', settings.apiToken ],
        queryFn: () =>
            laravelRequest< { data: TagOption[] } >( settings, '/tags' ),
    } );

    const tags = ( tagsQuery.data?.data ?? [] ).map( ( t ) => ( {
        id: Number( t.id ),
        name: t.name,
    } ) );

    const saveMutation = useMutation( {
        mutationFn: ( payload: AutomationFormData & { steps: AutomationStep[] } ) =>
            laravelRequest< LaravelResource< Automation > >(
                settings,
                isEdit ? `/automations/${ automationId }` : '/automations',
                { method: isEdit ? 'PUT' : 'POST', body: payload }
            ),
        onSuccess: ( res ) => {
            queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );
            if ( ! isEdit && res.data?.id ) {
                navigate( `/automations/${ res.data.id }/edit` );
            }
            setError( '' );
        },
        onError: ( err: Error ) => setError( err.message ),
    } );

    const activateMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, `/automations/${ automationId }/activate`, { method: 'POST' } ),
        onSuccess: () => {
            queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );
            queryClient.invalidateQueries( { queryKey: [ 'np-automation', automationId ] } );
        },
        onError: ( err: Error ) => setError( err.message ),
    } );

    const pauseMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, `/automations/${ automationId }/pause`, { method: 'POST' } ),
        onSuccess: () => {
            queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );
            queryClient.invalidateQueries( { queryKey: [ 'np-automation', automationId ] } );
        },
    } );

    const handleSave = () => {
        if ( ! form.name.trim() ) {
            setError( 'Name is required.' );
            return;
        }
        saveMutation.mutate( { ...form, steps } );
    };

    const automation = automationQuery.data?.data;
    const currentStatus = automation?.status;

    if ( isEdit && automationQuery.isLoading ) {
        return <p className={ ui.subtext }>Loading…</p>;
    }

    const currentTrigger = TRIGGERS.find( ( t ) => t.value === form.trigger_type );

    return (
        <div className="flex h-[calc(100vh-120px)] flex-col">
            { /* Header */ }
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/automations" className={ ui.ghostButton }>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            { isEdit ? ( form.name || 'Edit Automation' ) : 'New Automation' }
                        </h2>
                        { isEdit && currentStatus && (
                            <span className={ `text-xs capitalize ${ currentStatus === 'active' ? 'text-emerald-600' : 'text-gray-400' }` }>
                                { currentStatus }
                            </span>
                        ) }
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    { isEdit && (
                        currentStatus === 'active' ? (
                            <Button
                                type="button"
                                className={ ui.secondaryButton }
                                onClick={ () => pauseMutation.mutate() }
                                disabled={ pauseMutation.isPending }
                            >
                                <Pause className="h-4 w-4" /> Pause
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                className={ ui.secondaryButton }
                                onClick={ () => activateMutation.mutate() }
                                disabled={ activateMutation.isPending }
                            >
                                <Play className="h-4 w-4" /> Activate
                            </Button>
                        )
                    ) }
                    <Button
                        type="button"
                        className={ ui.primaryButton }
                        onClick={ handleSave }
                        disabled={ saveMutation.isPending }
                    >
                        { saveMutation.isPending ? 'Saving…' : ( isEdit ? 'Save' : 'Save Draft' ) }
                    </Button>
                </div>
            </div>

            { error && (
                <div className={ `${ ui.noticeError } mx-4 mt-3 flex-shrink-0` }>{ error }</div>
            ) }

            { saveMutation.isSuccess && ! isEdit && (
                <div className={ `${ ui.noticeSuccess } mx-4 mt-3 flex-shrink-0` }>Saved!</div>
            ) }

            <div className="flex flex-1 overflow-hidden">
                { /* Settings panel */ }
                <aside className="w-64 flex-shrink-0 space-y-4 overflow-y-auto border-r border-gray-200 bg-gray-50/50 p-4">
                    <div className="space-y-1">
                        <label className={ ui.label }>Name *</label>
                        <input
                            className={ ui.input }
                            value={ form.name }
                            onChange={ ( e ) => setForm( { ...form, name: e.target.value } ) }
                            placeholder="e.g. Welcome Series"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={ ui.label }>Description</label>
                        <textarea
                            className={ ui.textarea }
                            rows={ 2 }
                            value={ form.description }
                            onChange={ ( e ) => setForm( { ...form, description: e.target.value } ) }
                            placeholder="Optional"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={ ui.label }>Trigger</label>
                        <Select
                            value={ form.trigger_type }
                            onValueChange={ ( value ) => setForm( { ...form, trigger_type: value as AutomationTrigger } ) }
                        >
                            <SelectTrigger className="min-h-11 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                { TRIGGERS.map( ( t ) => (
                                    <SelectItem key={ t.value } value={ t.value }>{ t.label }</SelectItem>
                                ) ) }
                            </SelectContent>
                        </Select>
                    </div>
                </aside>

                { /* Canvas */ }
                <main className="flex-1 overflow-hidden">
                    <AutomationCanvas
                        steps={ steps }
                        onChange={ setSteps }
                        notifications={ notifications }
                        tags={ tags }
                        triggerLabel={ currentTrigger?.label ?? 'Trigger' }
                    />
                </main>
            </div>
        </div>
    );
}

// ── Page router ───────────────────────────────────────────────────────────────

export default function AutomationsPage() {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    const settings = settingsQuery.data;
    const { automationId } = useParams< { automationId: string } >();
    const location = useLocation();
    const isNew = location.pathname === '/automations/new';
    const isEdit = Boolean( automationId );

    if ( ! settings ) {
        return <p className={ ui.subtext }>Loading…</p>;
    }

    if ( isNew || isEdit ) {
        return <AutomationForm settings={ settings } automationId={ automationId } />;
    }

    return <AutomationsList settings={ settings } />;
}
