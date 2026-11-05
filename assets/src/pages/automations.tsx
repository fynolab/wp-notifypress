import { useEffect, useState } from '@wordpress/element';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

// Pausing takes everyone currently in the automation out, and they are not picked up again
// on reactivation, so both Pause buttons ask first.
const PAUSE_CONFIRMATION: ConfirmOptions = {
    title: 'Pause this automation?',
    description:
        'No new subscribers will be enrolled, and anyone already in it is removed and gets nothing more from it. They are not picked up again if you activate it later.',
    confirmLabel: 'Pause',
};
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
import {
    Chip,
    CursorPager,
    EmptyState,
    PageHeader,
    SearchInput,
    SectionCard,
    SegmentedControl,
    SegmentedLinks,
} from '../components/page-parts';
import type { ChipTone } from '../components/page-parts';
import { formatDateTime } from '../components/dashboard/format';
import { automationsListQuery } from '../components/automations/automations-query';
import type { AutomationStatusFilter } from '../components/automations/automations-query';
import PaidFeatureOverlay from '../components/paid-feature-overlay';
import { useConfirm } from '../components/confirm-dialog';
import type { ConfirmOptions } from '../components/confirm-dialog';
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
    AutomationStatus,
    AutomationStep,
    AutomationTrigger,
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

interface TagOption {
    id: number;
    name: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRIGGERS: Array< { value: AutomationTrigger; label: string } > = [
    { value: 'subscriber_created', label: 'Subscriber Joins' },
    { value: 'custom_event', label: 'Custom Event' },
];

// ── List view ─────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 300;

const STATUS: Record< AutomationStatus, { label: string; tone: ChipTone } > = {
    draft: { label: 'Inactive', tone: 'neutral' },
    active: { label: 'Active', tone: 'success' },
    paused: { label: 'Paused', tone: 'warning' },
    archived: { label: 'Archived', tone: 'danger' },
};

function share( part: number, total: number ): number {
    if ( ! total ) {
        return 0;
    }

    return Math.round( ( part / total ) * 100 );
}

function AutomationsList( { settings }: { settings: NotifyPressSettings } ) {
    const queryClient = useQueryClient();
    const [ confirm, confirmDialog ] = useConfirm();
    const [ search, setSearch ] = useState( '' );
    const [ query, setQuery ] = useState( '' );
    const [ statusFilter, setAutomationStatusFilter ] =
        useState< AutomationStatusFilter >( 'all' );
    const [ page, setPage ] = useState( 1 );

    // Wait for typing to pause before asking the server.
    useEffect( () => {
        const next = search.trim();

        if ( next === query ) {
            return;
        }

        const timer = window.setTimeout( () => {
            setQuery( next );
            setPage( 1 );
        }, SEARCH_DEBOUNCE_MS );

        return () => {
            window.clearTimeout( timer );
        };
    }, [ search, query ] );

    const listQuery = useQuery( {
        ...automationsListQuery( settings, statusFilter, query, page ),
        placeholderData: keepPreviousData,
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
            laravelRequest( settings, `/automations/${ id }/activate`, {
                method: 'POST',
            } ),
        onSuccess: invalidate,
        // The app refuses an automation that cannot run yet (no steps, or a Send step
        // without a message); say why instead of leaving the click with no effect.
        onError: ( err: Error ) => toast.error( err.message ),
    } );

    const pauseMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/pause`, {
                method: 'POST',
            } ),
        onSuccess: invalidate,
    } );

    const archiveMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/archive`, {
                method: 'POST',
            } ),
        onSuccess: invalidate,
    } );

    const duplicateMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }/duplicate`, {
                method: 'POST',
            } ),
        onSuccess: invalidate,
    } );

    const deleteMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/automations/${ id }`, {
                method: 'DELETE',
            } ),
        onSuccess: invalidate,
    } );

    const automations = listQuery.data?.data ?? [];
    const statusCounts = listQuery.data?.statusCounts ?? {
        all: 0,
        active: 0,
        paused: 0,
        inactive: 0,
    };
    const isPaidUser = listQuery.data?.isPaidUser ?? true;
    const currentPage = listQuery.data?.current_page ?? page;
    const hasPrevious = Boolean( listQuery.data?.prev_page_url );
    const hasNext = Boolean( listQuery.data?.next_page_url );
    const isFiltered = query !== '' || statusFilter !== 'all';

    const handleTabChange = ( next: AutomationStatusFilter ) => {
        setAutomationStatusFilter( next );
        setPage( 1 );
    };

    const handlePause = async ( id: number ) => {
        if ( ! ( await confirm( PAUSE_CONFIRMATION ) ) ) {
            return;
        }

        pauseMutation.mutate( id );
    };

    const handleStop = async ( id: number ) => {
        const confirmed = await confirm( {
            title: 'Stop this automation?',
            description:
                'This cannot be undone. Subscribers already enrolled will finish, but no new ones will be enrolled.',
            confirmLabel: 'Stop',
            destructive: true,
        } );

        if ( ! confirmed ) {
            return;
        }

        archiveMutation.mutate( id );
    };

    const handleDelete = async ( id: number ) => {
        const confirmed = await confirm( {
            title: 'Delete this automation?',
            description: 'This cannot be undone.',
            confirmLabel: 'Delete',
            destructive: true,
        } );

        if ( ! confirmed ) {
            return;
        }

        deleteMutation.mutate( id );
    };

    const createButton = (
        <Button asChild className="h-10 gap-2 px-4">
            <Link to="/automations/templates">
                <Plus className="h-4 w-4" aria-hidden />
                Create an automation
            </Link>
        </Button>
    );

    let tableContent: JSX.Element;

    if ( listQuery.isLoading ) {
        tableContent = (
            <p className="mt-4 py-10 text-center text-sm text-muted-foreground">
                Loading…
            </p>
        );
    } else if ( automations.length === 0 ) {
        tableContent = (
            <EmptyState
                icon={ <Workflow className="h-5 w-5" /> }
                title={
                    isFiltered ? 'No automations match' : 'No automations yet'
                }
            >
                <p className="max-w-80 text-sm text-muted-foreground">
                    { isFiltered
                        ? 'Try a different search or status filter.'
                        : 'Create your first automation to send notifications automatically when subscribers join.' }
                </p>
                { isFiltered ? null : (
                    <div className="mt-1">{ createButton }</div>
                ) }
            </EmptyState>
        );
    } else {
        tableContent = (
            <div className="mt-4 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="whitespace-nowrap">
                                Name
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Status
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right">
                                Active now
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right">
                                Started
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Finished
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right">
                                Suspended
                            </TableHead>
                            <TableHead className="w-[120px]">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        { automations.map( ( automation ) => (
                            <AutomationRow
                                key={ automation.id }
                                automation={ automation }
                                onPause={ handlePause }
                                onActivate={ ( id ) => {
                                    activateMutation.mutate( id );
                                } }
                                onStop={ handleStop }
                                onDuplicate={ ( id ) => {
                                    duplicateMutation.mutate( id );
                                } }
                                onDelete={ handleDelete }
                            />
                        ) ) }
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            { confirmDialog }
            <PageHeader
                title="Automations"
                description="Trigger-based notification sequences that run automatically."
                actions={
                    <>
                        <div
                            onMouseEnter={ prefetchMessages }
                            onFocus={ prefetchMessages }
                        >
                            <SegmentedLinks
                                label="Automation sections"
                                items={ [
                                    {
                                        to: '/automations',
                                        label: 'Workflows',
                                        active: true,
                                    },
                                    {
                                        to: '/automations/messages',
                                        label: 'Messages',
                                        active: false,
                                    },
                                ] }
                            />
                        </div>
                        { isPaidUser ? createButton : null }
                    </>
                }
            />

            <PaidFeatureOverlay
                isPaidUser={ isPaidUser }
                featureName="Automations"
                description="Automation workflows are available on Starter plans and above. Upgrade to send notifications automatically when subscribers join or take an action."
            >
                <SectionCard
                    title="Workflows"
                    description="Enrollment counts since each automation started"
                    actions={
                        <>
                            <SegmentedControl< AutomationStatusFilter >
                                value={ statusFilter }
                                onChange={ handleTabChange }
                                label="Filter by status"
                                options={ [
                                    {
                                        key: 'all',
                                        label: 'All',
                                        count: statusCounts.all,
                                    },
                                    {
                                        key: 'active',
                                        label: 'Active',
                                        count: statusCounts.active,
                                    },
                                    {
                                        key: 'paused',
                                        label: 'Paused',
                                        count: statusCounts.paused,
                                    },
                                    {
                                        key: 'draft',
                                        label: 'Inactive',
                                        count: statusCounts.inactive,
                                    },
                                ] }
                            />
                            <SearchInput
                                value={ search }
                                onChange={ setSearch }
                                label="Search automations"
                                placeholder="Search for an automation"
                            />
                        </>
                    }
                    footer={
                        automations.length > 0 ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    { automations.length } on this page
                                </p>
                                <CursorPager
                                    label="Automation pages"
                                    hasPrevious={ hasPrevious }
                                    hasNext={ hasNext }
                                    disabled={ listQuery.isFetching }
                                    onPrevious={ () => {
                                        setPage(
                                            Math.max( 1, currentPage - 1 )
                                        );
                                    } }
                                    onNext={ () => {
                                        setPage( currentPage + 1 );
                                    } }
                                />
                            </>
                        ) : null
                    }
                >
                    { tableContent }
                </SectionCard>
            </PaidFeatureOverlay>
        </div>
    );
}

function AutomationRow( {
    automation,
    onPause,
    onActivate,
    onStop,
    onDuplicate,
    onDelete,
}: {
    automation: Automation;
    onPause: ( id: number ) => void;
    onActivate: ( id: number ) => void;
    onStop: ( id: number ) => void;
    onDuplicate: ( id: number ) => void;
    onDelete: ( id: number ) => void;
} ) {
    const status = STATUS[ automation.status ] ?? STATUS.draft;
    const started = automation.started_count ?? 0;
    const active = automation.active_count ?? 0;
    const finished = automation.finished_count ?? 0;
    const suspended = automation.suspended_count ?? 0;
    const finishedShare = share( finished, started );
    const isArchived = automation.status === 'archived';
    let runButton: JSX.Element | null = null;

    if ( ! isArchived && automation.status === 'active' ) {
        runButton = (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                onClick={ () => onPause( automation.id ) }
                title="Pause"
                aria-label={ `Pause ${ automation.name }` }
            >
                <Pause className="h-4 w-4" aria-hidden />
            </Button>
        );
    } else if ( ! isArchived ) {
        runButton = (
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                onClick={ () => onActivate( automation.id ) }
                title="Activate"
                aria-label={ `Activate ${ automation.name }` }
            >
                <Play className="h-4 w-4" aria-hidden />
            </Button>
        );
    }

    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex min-w-56 max-w-96 items-center gap-3">
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                        aria-hidden
                    >
                        <Workflow className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <Link
                            to={ `/automations/${ automation.id }/edit` }
                            className="block truncate font-medium text-foreground hover:text-primary"
                        >
                            { automation.name }
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                            #{ automation.id } · Last edited{ ' ' }
                            { formatDateTime( automation.updated_at ) }
                        </p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Chip tone={ status.tone } dot>
                    { status.label }
                </Chip>
            </TableCell>
            <TableCell className="text-right">
                <p className="font-semibold tabular-nums text-foreground">
                    { active.toLocaleString() }
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                    { share( active, started ) }%
                </p>
            </TableCell>
            <TableCell className="text-right font-semibold tabular-nums text-foreground">
                { started.toLocaleString() }
            </TableCell>
            <TableCell>
                <div className="w-[120px]">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold tabular-nums text-foreground">
                            { finished.toLocaleString() }
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                            { finishedShare }%
                        </span>
                    </div>
                    <div
                        className="mt-1 h-1 overflow-hidden rounded-full bg-muted"
                        aria-hidden
                    >
                        <div
                            className="h-full rounded-full bg-primary"
                            style={ { width: `${ finishedShare }%` } }
                        />
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <p className="font-semibold tabular-nums text-foreground">
                    { suspended.toLocaleString() }
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                    { share( suspended, started ) }%
                </p>
            </TableCell>
            <TableCell>
                <div className="flex items-center justify-end gap-1">
                    { runButton }
                    { isArchived ? null : (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={ () => onStop( automation.id ) }
                            title="Stop"
                            aria-label={ `Stop ${ automation.name }` }
                        >
                            <Square className="h-4 w-4" aria-hidden />
                        </Button>
                    ) }
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={ `More actions for ${ automation.name }` }
                            >
                                <MoreVertical className="h-4 w-4" aria-hidden />
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
                                onClick={ () => onDuplicate( automation.id ) }
                            >
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={ () => onDelete( automation.id ) }
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </TableCell>
        </TableRow>
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
    const [ confirm, confirmDialog ] = useConfirm();
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
            laravelRequest< {
                data: Array< { message_id: number; title: string } >;
            } >( settings, '/automations/messages' ),
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
        mutationFn: (
            payload: AutomationFormData & { steps: AutomationStep[] }
        ) =>
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
            laravelRequest(
                settings,
                `/automations/${ automationId }/activate`,
                { method: 'POST' }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );
            queryClient.invalidateQueries( {
                queryKey: [ 'np-automation', automationId ],
            } );
        },
        onError: ( err: Error ) => setError( err.message ),
    } );

    const pauseMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, `/automations/${ automationId }/pause`, {
                method: 'POST',
            } ),
        onSuccess: () => {
            queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );
            queryClient.invalidateQueries( {
                queryKey: [ 'np-automation', automationId ],
            } );
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

    const currentTrigger = TRIGGERS.find(
        ( t ) => t.value === form.trigger_type
    );
    let saveLabel = isEdit ? 'Save' : 'Save Draft';

    if ( saveMutation.isPending ) {
        saveLabel = 'Saving…';
    }

    return (
        <div className="flex h-[calc(100vh-120px)] flex-col">
            { confirmDialog }
            { /* Header */ }
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/automations" className={ ui.ghostButton }>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            { isEdit
                                ? form.name || 'Edit Automation'
                                : 'New Automation' }
                        </h2>
                        { isEdit && currentStatus && (
                            <span
                                className={ `text-xs capitalize ${
                                    currentStatus === 'active'
                                        ? 'text-emerald-600'
                                        : 'text-gray-400'
                                }` }
                            >
                                { currentStatus }
                            </span>
                        ) }
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    { isEdit && currentStatus === 'active' ? (
                        <Button
                            type="button"
                            className={ ui.secondaryButton }
                            onClick={ async () => {
                                if ( await confirm( PAUSE_CONFIRMATION ) ) {
                                    pauseMutation.mutate();
                                }
                            } }
                            disabled={ pauseMutation.isPending }
                        >
                            <Pause className="h-4 w-4" /> Pause
                        </Button>
                    ) : null }
                    { isEdit && currentStatus !== 'active' ? (
                        <Button
                            type="button"
                            className={ ui.secondaryButton }
                            onClick={ () => activateMutation.mutate() }
                            disabled={ activateMutation.isPending }
                        >
                            <Play className="h-4 w-4" /> Activate
                        </Button>
                    ) : null }
                    <Button
                        type="button"
                        className={ ui.primaryButton }
                        onClick={ handleSave }
                        disabled={ saveMutation.isPending }
                    >
                        { saveLabel }
                    </Button>
                </div>
            </div>

            { error && (
                <div
                    className={ `${ ui.noticeError } mx-4 mt-3 flex-shrink-0` }
                >
                    { error }
                </div>
            ) }

            { saveMutation.isSuccess && ! isEdit && (
                <div
                    className={ `${ ui.noticeSuccess } mx-4 mt-3 flex-shrink-0` }
                >
                    Saved!
                </div>
            ) }

            <div className="flex flex-1 overflow-hidden">
                { /* Settings panel */ }
                <aside className="w-64 flex-shrink-0 space-y-4 overflow-y-auto border-r border-gray-200 bg-gray-50/50 p-4">
                    <div className="space-y-1">
                        <label
                            htmlFor="np-automation-name"
                            className={ ui.label }
                        >
                            Name *
                        </label>
                        <input
                            id="np-automation-name"
                            className={ ui.input }
                            value={ form.name }
                            onChange={ ( e ) =>
                                setForm( { ...form, name: e.target.value } )
                            }
                            placeholder="e.g. Welcome Series"
                        />
                    </div>
                    <div className="space-y-1">
                        <label
                            htmlFor="np-automation-description"
                            className={ ui.label }
                        >
                            Description
                        </label>
                        <textarea
                            id="np-automation-description"
                            className={ ui.textarea }
                            rows={ 2 }
                            value={ form.description }
                            onChange={ ( e ) =>
                                setForm( {
                                    ...form,
                                    description: e.target.value,
                                } )
                            }
                            placeholder="Optional"
                        />
                    </div>
                    <div className="space-y-1">
                        <label
                            htmlFor="np-automation-trigger"
                            className={ ui.label }
                        >
                            Trigger
                        </label>
                        <Select
                            value={ form.trigger_type }
                            onValueChange={ ( value ) =>
                                setForm( {
                                    ...form,
                                    trigger_type: value as AutomationTrigger,
                                } )
                            }
                        >
                            <SelectTrigger
                                id="np-automation-trigger"
                                className="min-h-11 w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                { TRIGGERS.map( ( t ) => (
                                    <SelectItem
                                        key={ t.value }
                                        value={ t.value }
                                    >
                                        { t.label }
                                    </SelectItem>
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
        return (
            <AutomationForm
                settings={ settings }
                automationId={ automationId }
            />
        );
    }

    return <AutomationsList settings={ settings } />;
}
