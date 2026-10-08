import { useCallback, type ChangeEvent } from 'react';
import { useEffect, useRef, useState } from '@wordpress/element';
import {
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    BackgroundVariant,
    type Node,
    type Edge,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Clock, Bell, Tag, Webhook, Zap, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import type { AutomationStep, AutomationStepType } from '../types';

interface Notification { id: number; title: string }
interface TagOption { id: number; name: string }

interface CanvasProps {
    steps: AutomationStep[];
    onChange: ( steps: AutomationStep[] ) => void;
    notifications: Notification[];
    tags: TagOption[];
    triggerLabel: string;
    readOnly?: boolean;
    highlightedNodeId?: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const nodeBase =
    'rounded-lg border bg-background shadow-sm px-4 py-3 w-[220px] text-sm';

// ── Node components ───────────────────────────────────────────────────────────

function TriggerNode( { data }: { data: { label: string } } ) {
    return (
        <div className={ `${ nodeBase } border-primary/50 bg-primary/5` }>
            <div className="flex items-center gap-2 font-medium text-primary">
                <Zap className="h-4 w-4" />
                <span className="truncate">{ data.label }</span>
            </div>
            <Handle type="source" position={ Position.Bottom } className="!bg-primary" />
        </div>
    );
}

function WaitNode( { data }: { data: { delayMinutes?: number } } ) {
    const mins = data.delayMinutes;
    const label = mins
        ? mins >= 1440
            ? `Wait ${ Math.round( mins / 1440 ) } day(s)`
            : mins >= 60
                ? `Wait ${ Math.round( mins / 60 ) } hr(s)`
                : `Wait ${ mins } min`
        : 'Wait';
    return (
        <div className={ `${ nodeBase } border-yellow-400/50 bg-yellow-50 dark:bg-yellow-900/20` }>
            <Handle type="target" position={ Position.Top } />
            <div className="flex items-center gap-2 font-medium text-yellow-700 dark:text-yellow-400">
                <Clock className="h-4 w-4" />
                <span>{ label }</span>
            </div>
            <Handle type="source" position={ Position.Bottom } />
        </div>
    );
}

function SendNotificationNode( { data }: { data: { notificationTitle?: string } } ) {
    return (
        <div className={ `${ nodeBase } border-blue-400/50 bg-blue-50 dark:bg-blue-900/20` }>
            <Handle type="target" position={ Position.Top } />
            <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-400">
                <Bell className="h-4 w-4" />
                <span>Send Notification</span>
            </div>
            { data.notificationTitle ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{ data.notificationTitle }</p>
            ) : null }
            <Handle type="source" position={ Position.Bottom } />
        </div>
    );
}

function AddTagNode( { data }: { data: { tagName?: string } } ) {
    return (
        <div className={ `${ nodeBase } border-emerald-600/50 bg-emerald-600/10 dark:bg-green-900/20` }>
            <Handle type="target" position={ Position.Top } />
            <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-green-400">
                <Tag className="h-4 w-4" />
                <span>Add Tag</span>
            </div>
            { data.tagName ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">{ data.tagName }</p>
            ) : null }
            <Handle type="source" position={ Position.Bottom } />
        </div>
    );
}

function WebhookNode( { data }: { data: { url?: string } } ) {
    return (
        <div className={ `${ nodeBase } border-purple-400/50 bg-purple-50 dark:bg-purple-900/20` }>
            <Handle type="target" position={ Position.Top } />
            <div className="flex items-center gap-2 font-medium text-purple-700 dark:text-purple-400">
                <Webhook className="h-4 w-4" />
                <span>Webhook</span>
            </div>
            { data.url ? (
                <p className="mt-1 text-xs text-muted-foreground font-mono line-clamp-1">
                    POST { data.url }
                </p>
            ) : null }
            <Handle type="source" position={ Position.Bottom } />
        </div>
    );
}

const nodeTypes = {
    trigger: TriggerNode,
    wait: WaitNode,
    send_notification: SendNotificationNode,
    add_tag: AddTagNode,
    webhook: WebhookNode,
};

// ── Config panel ──────────────────────────────────────────────────────────────

const STEP_LABELS: Record< AutomationStepType, string > = {
    wait: 'Wait',
    send_notification: 'Send Notification',
    add_tag: 'Add Tag',
    webhook: 'Webhook',
};

function WaitDelayInput( {
    cfg,
    onUpdate,
    inputCls,
    labelCls,
}: {
    cfg: Record< string, unknown >;
    onUpdate: ( config: Record< string, unknown > ) => void;
    inputCls: string;
    labelCls: string;
} ) {
    const initialMinutes = ( cfg.delay_minutes as number ) ?? 1440;
    const [ raw, setRaw ] = useState< string >( String( initialMinutes ) );

    const handleChange = ( e: ChangeEvent< HTMLInputElement > ) => {
        setRaw( e.target.value );
        const val = parseInt( e.target.value, 10 );
        if ( ! isNaN( val ) && val >= 1 && val <= 43200 ) {
            onUpdate( { ...cfg, delay_minutes: val } );
        }
    };

    const handleBlur = () => {
        const val = parseInt( raw, 10 );
        if ( isNaN( val ) || val < 1 || val > 43200 ) {
            const fallback = ( cfg.delay_minutes as number ) ?? 1440;
            setRaw( String( fallback ) );
        }
    };

    return (
        <div>
            <label className={ labelCls }>Delay (minutes)</label>
            <input
                type="number"
                min={ 1 }
                max={ 43200 }
                className={ inputCls }
                value={ raw }
                onChange={ handleChange }
                onBlur={ handleBlur }
            />
            <p className="mt-1 text-xs text-muted-foreground">
                1 – 43200 min (max 1 month) · 1440 = 1 day · 60 = 1 hr
            </p>
        </div>
    );
}

export function ConfigPanel( {
    step,
    notifications,
    tags,
    onUpdate,
    onRemove,
}: {
    step: AutomationStep;
    notifications: Notification[];
    tags: TagOption[];
    onUpdate: ( config: Record< string, unknown > ) => void;
    onRemove?: () => void;
} ) {
    const cfg = step.config;
    const inputCls =
        'w-full rounded border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
    const labelCls = 'mb-1 block text-xs font-semibold text-muted-foreground';

    return (
        <div className="space-y-3 text-sm">
            <p className="font-semibold text-foreground">{ STEP_LABELS[ step.type ] }</p>

            { step.type === 'wait' && (
                <WaitDelayInput
                    key={ step.nodeId }
                    cfg={ cfg }
                    onUpdate={ onUpdate }
                    inputCls={ inputCls }
                    labelCls={ labelCls }
                />
            ) }

            { step.type === 'send_notification' && (
                <div>
                    <label className={ labelCls }>Notification</label>
                    <Select
                        value={ String( cfg.notification_id ?? '' ) || '_none' }
                        onValueChange={ ( value ) =>
                            onUpdate( { ...cfg, notification_id: value === '_none' ? undefined : parseInt( value ) || undefined } )
                        }
                    >
                        <SelectTrigger className={ inputCls }>
                            <SelectValue placeholder="Pick a notification…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_none">Pick a notification…</SelectItem>
                            { notifications.map( ( n ) => (
                                <SelectItem key={ n.id } value={ String( n.id ) }>{ n.title }</SelectItem>
                            ) ) }
                        </SelectContent>
                    </Select>
                </div>
            ) }

            { step.type === 'add_tag' && (
                <div>
                    <label className={ labelCls }>Tag</label>
                    <Select
                        value={ String( cfg.tag_id ?? '' ) || '_none' }
                        onValueChange={ ( value ) =>
                            onUpdate( { ...cfg, tag_id: value === '_none' ? undefined : parseInt( value ) || undefined } )
                        }
                    >
                        <SelectTrigger className={ inputCls }>
                            <SelectValue placeholder="Pick a tag…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_none">Pick a tag…</SelectItem>
                            { tags.map( ( t ) => (
                                <SelectItem key={ t.id } value={ String( t.id ) }>{ t.name }</SelectItem>
                            ) ) }
                        </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">Assigns tag to subscriber for segment targeting.</p>
                </div>
            ) }

            { step.type === 'webhook' && (
                <>
                    <div>
                        <label className={ labelCls }>URL (HTTPS)</label>
                        <input
                            type="url"
                            className={ inputCls }
                            value={ ( cfg.url as string ) ?? '' }
                            onChange={ ( e ) => onUpdate( { ...cfg, url: e.target.value } ) }
                            placeholder="https://example.com/webhook"
                        />
                    </div>
                    <div>
                        <label className={ labelCls }>Authorization Header <span className="font-normal text-muted-foreground">(optional)</span></label>
                        <input
                            className={ inputCls }
                            value={ ( cfg.headers as Record< string, string > )?.Authorization ?? '' }
                            onChange={ ( e ) =>
                                onUpdate( {
                                    ...cfg,
                                    headers: { ...( cfg.headers as object ?? {} ), Authorization: e.target.value },
                                } )
                            }
                            placeholder="Bearer token123"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        POST · Payload includes subscriber, site, automation, enrollment, and notification.
                    </p>
                </>
            ) }

            { onRemove ? (
                <Button
                    type="button"
                    onClick={ onRemove }
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
                >
                    <X className="h-3 w-3" /> Remove Step
                </Button>
            ) : null }
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let stepCounter = 0;
const TRIGGER_ID = 'trigger-node';
// fitView centres the flow in whatever width the canvas has, so node x
// positions only have to line up with each other, not with the container.
// maxZoom stops a short flow from being blown up to fill the space.
const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 };

// The flow is a single vertical chain: the trigger sits in the same column as
// the steps, so its x follows the first step's (templates store 0; automations
// saved before fitView was used store wherever the canvas centre was then).
function chainX( localSteps: AutomationStep[] ): number {
    return localSteps[ 0 ]?.position_x ?? 0;
}

export const STEP_TYPES: Array< { value: AutomationStepType; label: string } > = [
    { value: 'wait', label: 'Wait' },
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'add_tag', label: 'Add Tag' },
    { value: 'webhook', label: 'Webhook' },
];

function defaultConfig( type: AutomationStepType ): Record< string, unknown > {
    if ( type === 'wait' ) { return { delay_minutes: 1440 }; }
    if ( type === 'webhook' ) { return { url: '', headers: {} }; }
    return {};
}

function nodeData(
    step: AutomationStep,
    notifications: Notification[],
    tags: TagOption[],
): Record< string, unknown > {
    if ( step.type === 'wait' ) { return { delayMinutes: step.config.delay_minutes }; }
    if ( step.type === 'send_notification' ) {
        return { notificationTitle: notifications.find( ( n ) => n.id === step.config.notification_id )?.title };
    }
    if ( step.type === 'add_tag' ) {
        return { tagName: tags.find( ( t ) => t.id === step.config.tag_id )?.name };
    }
    if ( step.type === 'webhook' ) { return { url: step.config.url }; }
    return {};
}

// ── Canvas (inner) ────────────────────────────────────────────────────────────

function Canvas( {
    steps,
    onChange,
    notifications,
    tags,
    triggerLabel,
    readOnly = false,
    highlightedNodeId,
}: CanvasProps ) {
    const buildNodes = ( localSteps: AutomationStep[] ): Node[] => {
        const nodes: Node[] = [ {
            id: TRIGGER_ID,
            type: 'trigger',
            position: { x: chainX( localSteps ), y: 40 },
            data: { label: triggerLabel },
            deletable: false,
        } ];
        localSteps.forEach( ( s ) => {
            nodes.push( {
                id: s.nodeId!,
                type: s.type,
                position: { x: s.position_x ?? 0, y: s.position_y ?? 0 },
                data: nodeData( s, notifications, tags ),
            } );
        } );
        return nodes;
    };

    const buildEdges = ( localSteps: AutomationStep[] ): Edge[] =>
        localSteps.map( ( s, i ) => {
            const sourceId = i === 0 ? TRIGGER_ID : ( localSteps[ i - 1 ]?.nodeId ?? TRIGGER_ID );
            return { id: `e-${ sourceId }-${ s.nodeId }`, source: sourceId, target: s.nodeId!, animated: true };
        } );

    const { fitView } = useReactFlow();
    const [ nodes, setNodes, onNodesChange ] = useNodesState( buildNodes( steps ) );
    const [ edges, setEdges, onEdgesChange ] = useEdgesState( buildEdges( steps ) );
    const [ selectedNodeId, setSelectedNodeId ] = useState< string | null >( null );
    const localStepsRef = useRef< AutomationStep[] >( steps );

    // Sync trigger node label when triggerLabel prop changes.
    useEffect( () => {
        setNodes( ( ns ) => ns.map( ( n ) =>
            n.id === TRIGGER_ID
                ? { ...n, data: { ...n.data, label: triggerLabel } }
                : n,
        ) );
    }, [ triggerLabel, setNodes ] );

    const highlightClass = ( nodeId: string ): string | undefined =>
        nodeId === highlightedNodeId
            ? 'ring-2 ring-primary ring-offset-2 rounded-lg'
            : undefined;

    // Ring-highlight the node matching highlightedNodeId (wizard mode).
    useEffect( () => {
        setNodes( ( ns ) => ns.map( ( n ) => ( {
            ...n,
            className: highlightClass( n.id ),
        } ) ) );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ highlightedNodeId, setNodes ] );

    // Rebuild nodes/edges when the steps prop is replaced from outside
    // (wizard add/remove, template seeding) rather than via canvas callbacks.
    useEffect( () => {
        if ( steps === localStepsRef.current ) {
            return;
        }

        localStepsRef.current = steps;
        // Keep the wizard's ring: a config edit rebuilds the nodes without moving the highlight.
        setNodes( buildNodes( steps ).map( ( n ) => ( { ...n, className: highlightClass( n.id ) } ) ) );
        setEdges( buildEdges( steps ) );
        fitView( FIT_VIEW_OPTIONS );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ steps ] );

    const selectedStep = localStepsRef.current.find( ( s ) => s.nodeId === selectedNodeId ) ?? null;

    const syncSteps = useCallback( ( newSteps: AutomationStep[] ) => {
        localStepsRef.current = newSteps;
        onChange( newSteps );
    }, [ onChange ] );

    const addStep = ( type: AutomationStepType ) => {
        const nodeId = `step-${ ++stepCounter }`;
        const yOffset = 160 + localStepsRef.current.length * 140;
        const x = localStepsRef.current[ localStepsRef.current.length - 1 ]?.position_x ?? 0;
        const newStep: AutomationStep = {
            type,
            config: defaultConfig( type ),
            position_x: x,
            position_y: yOffset,
            parent_step_id: null,
            branch: null,
            nodeId,
        };
        const newSteps = [ ...localStepsRef.current, newStep ];
        syncSteps( newSteps );

        const lastNodeId = localStepsRef.current.length <= 1
            ? TRIGGER_ID
            : ( localStepsRef.current[ localStepsRef.current.length - 2 ]?.nodeId ?? TRIGGER_ID );

        setNodes( ( ns ) => [ ...ns, {
            id: nodeId,
            type,
            position: { x, y: yOffset },
            data: nodeData( newStep, notifications, tags ),
        } ] );
        setEdges( ( es ) => [ ...es, {
            id: `e-${ lastNodeId }-${ nodeId }`,
            source: lastNodeId,
            target: nodeId,
            animated: true,
        } ] );
    };

    const updateStepConfig = ( nodeId: string, config: Record< string, unknown > ) => {
        const newSteps = localStepsRef.current.map( ( s ) =>
            s.nodeId === nodeId ? { ...s, config } : s,
        );
        syncSteps( newSteps );
        const updated = newSteps.find( ( s ) => s.nodeId === nodeId );
        if ( ! updated ) { return; }
        setNodes( ( ns ) => ns.map( ( n ) =>
            n.id === nodeId ? { ...n, data: nodeData( updated, notifications, tags ) } : n,
        ) );
    };

    const removeStep = ( nodeId: string ) => {
        syncSteps( localStepsRef.current.filter( ( s ) => s.nodeId !== nodeId ) );
        setNodes( ( ns ) => ns.filter( ( n ) => n.id !== nodeId ) );
        setEdges( ( es ) => es.filter( ( e ) => e.source !== nodeId && e.target !== nodeId ) );
        setSelectedNodeId( null );
    };

    const onNodeDragStop = useCallback( ( _: unknown, node: Node ) => {
        if ( readOnly ) {
            return;
        }

        syncSteps( localStepsRef.current.map( ( s ) =>
            s.nodeId === node.id ? { ...s, position_x: node.position.x, position_y: node.position.y } : s,
        ) );
    }, [ readOnly, syncSteps ] );

    const onNodeClick = useCallback( ( _: unknown, node: Node ) => {
        if ( readOnly ) {
            return;
        }

        setSelectedNodeId( node.id === TRIGGER_ID ? null : node.id );
    }, [ readOnly ] );

    return (
        <div className="flex h-full">
            <div className="relative flex-1">
                <ReactFlow
                    nodes={ nodes }
                    edges={ edges }
                    onNodesChange={ onNodesChange }
                    onEdgesChange={ onEdgesChange }
                    nodeTypes={ nodeTypes }
                    onNodeClick={ onNodeClick }
                    onNodeDragStop={ onNodeDragStop }
                    fitView
                    fitViewOptions={ FIT_VIEW_OPTIONS }
                    nodesDraggable={ ! readOnly }
                    nodesConnectable={ ! readOnly }
                    elementsSelectable={ ! readOnly }
                >
                    <Background variant={ BackgroundVariant.Dots } gap={ 20 } size={ 1 } />
                    <Controls showInteractive={ ! readOnly } />
                </ReactFlow>

                { /* Add step toolbar */ }
                { ! readOnly ? (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-wrap gap-2 rounded-full border bg-background px-4 py-2 shadow-md">
                        { STEP_TYPES.map( ( t ) => (
                            <Button
                                key={ t.value }
                                type="button"
                                onClick={ () => addStep( t.value ) }
                                className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
                            >
                                <Plus className="h-3 w-3" />
                                { t.label }
                            </Button>
                        ) ) }
                    </div>
                ) : null }
            </div>

            { /* Config panel */ }
            { ! readOnly && selectedStep && selectedNodeId ? (
                <aside className="w-56 flex-shrink-0 overflow-y-auto border-l bg-background p-4">
                    <ConfigPanel
                        step={ selectedStep }
                        notifications={ notifications }
                        tags={ tags }
                        onUpdate={ ( config ) => updateStepConfig( selectedNodeId, config ) }
                        onRemove={ () => removeStep( selectedNodeId ) }
                    />
                </aside>
            ) : null }
        </div>
    );
}

export default function AutomationCanvas( props: CanvasProps ) {
    return (
        <ReactFlowProvider>
            <Canvas { ...props } />
        </ReactFlowProvider>
    );
}
