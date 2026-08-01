import type { ReactNode } from 'react';
import { useState } from '@wordpress/element';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { laravelRequest } from '../lib/api';
import { getSettings } from '../lib/settings';
import { ui } from '../lib/admin-ui';
import {
    minutesToUnits,
    unitsToMinutes,
    type WaitUnits,
} from '../lib/wait-duration';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import AutomationCanvas, { ConfigPanel, STEP_TYPES } from './automations-canvas';
import { AutomationForm, TRIGGERS } from './automations';
import type { TemplatesResponse } from './automations-templates';
import type {
    Automation,
    AutomationStep,
    AutomationStepType,
    AutomationTemplate,
    AutomationTrigger,
    LaravelResource,
    NotifyPressSettings,
} from '../types';

let wizardStepCounter = 0;

function seedSteps( template: AutomationTemplate | undefined ): AutomationStep[] {
    if ( ! template ) {
        return [];
    }

    return template.steps.map( ( s ) => ( {
        type: s.type,
        config: s.config,
        position_x: s.position_x,
        position_y: s.position_y,
        parent_step_id: null,
        branch: null,
        nodeId: `wizard-step-${ ++wizardStepCounter }`,
    } ) );
}

const STEP_INSTRUCTIONS: Record< string, string > = {
    wait: 'Choose how long to wait before moving to the next step.',
    send_notification:
        'Pick the push notification message to send at this step.',
    add_tag: 'Choose a tag to assign to the subscriber at this step.',
    webhook: 'Configure the webhook this step should call.',
};

// ── Wait duration inputs (months / days / hours / minutes) ────────────────────

const WAIT_FIELDS: Array< { key: keyof WaitUnits; label: string } > = [
    { key: 'months', label: 'Months' },
    { key: 'days', label: 'Days' },
    { key: 'hours', label: 'Hours' },
    { key: 'minutes', label: 'Minutes' },
];

function WaitDurationInputs( {
    delayMinutes,
    onChange,
}: {
    delayMinutes: number;
    onChange: ( minutes: number ) => void;
} ) {
    const units = minutesToUnits( delayMinutes );

    const handleUnitChange = ( key: keyof WaitUnits, value: number ) => {
        const next = { ...units, [ key ]: Math.max( 0, value ) };
        onChange( unitsToMinutes( next ) );
    };

    return (
        <div className="space-y-2">
            <Label>Choose the period of time before next step</Label>
            <div className="grid grid-cols-4 gap-2">
                { WAIT_FIELDS.map( ( field ) => (
                    <div key={ field.key } className="space-y-1">
                        <Label className="text-xs font-normal text-muted-foreground">
                            { field.label }
                        </Label>
                        <Input
                            type="number"
                            min={ 0 }
                            value={ units[ field.key ] }
                            onChange={ ( event ) =>
                                handleUnitChange(
                                    field.key,
                                    parseInt( event.target.value, 10 ) || 0
                                )
                            }
                        />
                    </div>
                ) ) }
            </div>
            <p className="text-xs text-muted-foreground">
                A one-month period is equivalent to 30 days.
            </p>
        </div>
    );
}

// ── Stepper shell ─────────────────────────────────────────────────────────────

function WizardStepper( {
    stepIndex,
    totalSteps,
    instructions,
    children,
    onSkipGuided,
    onPrevious,
    onNext,
    isLastStep,
    nextProcessing,
}: {
    stepIndex: number;
    totalSteps: number;
    instructions: string;
    children: ReactNode;
    onSkipGuided: () => void;
    onPrevious: () => void;
    onNext: () => void;
    isLastStep: boolean;
    nextProcessing?: boolean;
} ) {
    const progress = ( ( stepIndex + 1 ) / totalSteps ) * 100;

    return (
        <div className="flex h-full w-96 flex-shrink-0 flex-col border-r bg-muted/30">
            <div className="space-y-3 border-b p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Step { stepIndex + 1 }/{ totalSteps }
                </div>
                <Progress value={ progress } />
                <p className="text-sm text-muted-foreground">
                    { instructions }
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">{ children }</div>

            <div className="flex items-center justify-between border-t p-4">
                <button
                    type="button"
                    onClick={ onSkipGuided }
                    className="text-sm font-medium text-primary hover:underline cursor-pointer"
                >
                    Skip guided setup
                </button>
                <div className="flex gap-2">
                    { stepIndex > 0 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={ onPrevious }
                        >
                            Previous
                        </Button>
                    ) : null }
                    <Button
                        type="button"
                        onClick={ onNext }
                        disabled={ nextProcessing }
                    >
                        { isLastStep
                            ? nextProcessing
                                ? 'Creating…'
                                : 'Create automation'
                            : 'Next' }
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

function Wizard( {
    settings,
    template,
}: {
    settings: NotifyPressSettings;
    template?: AutomationTemplate;
} ) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [ skippedGuided, setSkippedGuided ] = useState( false );
    const [ stepIndex, setStepIndex ] = useState( 0 );
    const [ steps, setSteps ] = useState< AutomationStep[] >( () =>
        seedSteps( template )
    );
    const [ error, setError ] = useState( '' );

    const templateTriggerConfig =
        template && ! Array.isArray( template.trigger_config )
            ? template.trigger_config
            : {};

    const [ form, setForm ] = useState( {
        name: template?.name ?? '',
        description: template?.description ?? '',
        trigger_type: ( template?.trigger_type ??
            'subscriber_created' ) as AutomationTrigger,
        trigger_config: templateTriggerConfig as Record< string, unknown >,
    } );

    // Automation messages for send_notification steps.
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
            laravelRequest< { data: Array< { id: number; name: string } > } >(
                settings,
                '/tags'
            ),
    } );

    const tags = ( tagsQuery.data?.data ?? [] ).map( ( t ) => ( {
        id: Number( t.id ),
        name: t.name,
    } ) );

    const createMutation = useMutation( {
        mutationFn: () =>
            laravelRequest< LaravelResource< Automation > >(
                settings,
                '/automations',
                { method: 'POST', body: { ...form, steps } }
            ),
        onSuccess: ( res ) => {
            queryClient.invalidateQueries( { queryKey: [ 'np-automations' ] } );
            if ( res.data?.id ) {
                navigate( `/automations/${ res.data.id }/edit` );
            } else {
                navigate( '/automations' );
            }
        },
        onError: ( err: Error ) => setError( err.message ),
    } );

    // "Skip guided setup" lifts the same data/steps state into the plain canvas editor.
    if ( skippedGuided ) {
        return (
            <AutomationForm
                settings={ settings }
                initial={ { ...form, steps } }
            />
        );
    }

    const totalSteps = 1 + steps.length + 1; // trigger screen + one per step + final review/add screen
    const isLastStep = stepIndex === totalSteps - 1;
    const currentStep =
        stepIndex >= 1 && stepIndex <= steps.length
            ? steps[ stepIndex - 1 ]
            : null;
    const triggerLabel =
        TRIGGERS.find( ( t ) => t.value === form.trigger_type )?.label ??
        'Trigger';
    const highlightedNodeId =
        stepIndex === 0 ? 'trigger-node' : currentStep?.nodeId;

    const updateCurrentStepConfig = ( config: Record< string, unknown > ) => {
        if ( ! currentStep ) {
            return;
        }

        setSteps( ( prev ) =>
            prev.map( ( s ) =>
                s.nodeId === currentStep.nodeId ? { ...s, config } : s
            )
        );
    };

    const removeCurrentStep = () => {
        if ( ! currentStep ) {
            return;
        }

        setSteps( ( prev ) =>
            prev.filter( ( s ) => s.nodeId !== currentStep.nodeId )
        );
        setStepIndex( ( i ) => Math.max( 0, i - 1 ) );
    };

    const addStep = ( type: AutomationStepType ) => {
        const defaults: Record< string, unknown > =
            type === 'wait'
                ? { delay_minutes: 1440 }
                : type === 'webhook'
                    ? { url: '', headers: {} }
                    : {};
        const newStep: AutomationStep = {
            type,
            config: defaults,
            position_x: 0,
            position_y: 160 + steps.length * 140,
            parent_step_id: null,
            branch: null,
            nodeId: `wizard-step-${ ++wizardStepCounter }`,
        };
        setSteps( ( prev ) => [ ...prev, newStep ] );
        setStepIndex( steps.length + 1 ); // jump to the newly added step's config screen
    };

    const handleNext = () => {
        if ( isLastStep ) {
            if ( ! form.name.trim() ) {
                setError( 'Name is required.' );
                setStepIndex( 0 );
                return;
            }

            createMutation.mutate();
            return;
        }

        setStepIndex( ( i ) => Math.min( totalSteps - 1, i + 1 ) );
    };

    const instructions =
        stepIndex === 0
            ? 'Start by naming your automation and setting up your trigger.'
            : currentStep
                ? STEP_INSTRUCTIONS[ currentStep.type ] ??
                  "Fill in this step's configuration."
                : 'Add another step, or create your automation now.';

    return (
        <div className="flex h-[calc(100vh-120px)] flex-col">
            { error ? (
                <div className={ `${ ui.noticeError } mx-4 mt-3 flex-shrink-0` }>
                    { error }
                </div>
            ) : null }

            <div className="flex flex-1 overflow-hidden">
                <WizardStepper
                    stepIndex={ stepIndex }
                    totalSteps={ totalSteps }
                    instructions={ instructions }
                    onSkipGuided={ () => setSkippedGuided( true ) }
                    onPrevious={ () => setStepIndex( ( i ) => Math.max( 0, i - 1 ) ) }
                    onNext={ handleNext }
                    isLastStep={ isLastStep }
                    nextProcessing={ createMutation.isPending }
                >
                    { stepIndex === 0 ? (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="wizard-name">Name</Label>
                                <Input
                                    id="wizard-name"
                                    value={ form.name }
                                    onChange={ ( event ) =>
                                        setForm( {
                                            ...form,
                                            name: event.target.value,
                                        } )
                                    }
                                    placeholder="e.g. Welcome Series"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="wizard-description">
                                    Description
                                </Label>
                                <Input
                                    id="wizard-description"
                                    value={ form.description }
                                    onChange={ ( event ) =>
                                        setForm( {
                                            ...form,
                                            description: event.target.value,
                                        } )
                                    }
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Trigger</Label>
                                <Select
                                    value={ form.trigger_type }
                                    onValueChange={ ( value ) =>
                                        setForm( {
                                            ...form,
                                            trigger_type:
                                                value as AutomationTrigger,
                                        } )
                                    }
                                >
                                    <SelectTrigger>
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
                        </div>
                    ) : currentStep ? (
                        <div className="space-y-3">
                            <p className="text-sm font-medium">
                                { STEP_TYPES.find(
                                    ( t ) => t.value === currentStep.type
                                )?.label ?? currentStep.type }
                            </p>
                            { currentStep.type === 'wait' ? (
                                <WaitDurationInputs
                                    delayMinutes={
                                        ( currentStep.config
                                            .delay_minutes as number ) ?? 1440
                                    }
                                    onChange={ ( minutes ) =>
                                        updateCurrentStepConfig( {
                                            ...currentStep.config,
                                            delay_minutes: minutes,
                                        } )
                                    }
                                />
                            ) : (
                                <ConfigPanel
                                    step={ currentStep }
                                    notifications={ notifications }
                                    tags={ tags }
                                    onUpdate={ updateCurrentStepConfig }
                                />
                            ) }
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={ removeCurrentStep }
                            >
                                Remove this step
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Add a step</p>
                            <div className="flex flex-wrap gap-2">
                                { STEP_TYPES.map( ( t ) => (
                                    <Button
                                        key={ t.value }
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={ () => addStep( t.value ) }
                                    >
                                        { t.label }
                                    </Button>
                                ) ) }
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Or click &quot;Create automation&quot; below to
                                finish without adding more steps.
                            </p>
                        </div>
                    ) }
                </WizardStepper>

                <main className="flex-1 overflow-hidden">
                    <AutomationCanvas
                        steps={ steps }
                        onChange={ setSteps }
                        notifications={ notifications }
                        tags={ tags }
                        triggerLabel={ triggerLabel }
                        readOnly
                        highlightedNodeId={ highlightedNodeId }
                    />
                </main>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AutomationWizardPage() {
    const [ searchParams ] = useSearchParams();
    const templateKey = searchParams.get( 'template' );

    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    const settings = settingsQuery.data;

    const templatesQuery = useQuery( {
        queryKey: [ 'np-automation-templates', settings?.apiToken ],
        enabled: Boolean( settings && templateKey ),
        queryFn: () =>
            laravelRequest< TemplatesResponse >(
                settings,
                '/automations/templates'
            ),
    } );

    if ( ! settings ) {
        return <p className={ ui.subtext }>Loading…</p>;
    }

    if ( templateKey && templatesQuery.isLoading ) {
        return <p className={ `${ ui.subtext } p-6` }>Loading…</p>;
    }

    const template = templateKey
        ? templatesQuery.data?.data.find( ( t ) => t.key === templateKey )
        : undefined;

    return (
        <Wizard
            key={ templateKey ?? 'scratch' }
            settings={ settings }
            template={ template }
        />
    );
}
