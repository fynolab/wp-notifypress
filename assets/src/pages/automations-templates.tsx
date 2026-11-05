import { useMemo, useState } from '@wordpress/element';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { laravelRequest } from '../lib/api';
import { getSettings } from '../lib/settings';
import { ui } from '../lib/admin-ui';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    PageHeader,
    SectionCard,
    SegmentedControl,
} from '../components/page-parts';
import { TemplateCard } from '../components/automations/template-card';
import AutomationCanvas from './automations-canvas';
import type {
    AutomationStep,
    AutomationTemplate,
    NotifyPressSettings,
} from '../types';

interface Option {
    value: string;
    label: string;
}

export interface TemplatesResponse {
    data: AutomationTemplate[];
    stepTypes: Option[];
    triggers: Option[];
    hasSite: boolean;
}

// ── Prerequisite banner ───────────────────────────────────────────────────────

type BannerVariant = 'no-site' | 'no-notifications' | 'custom-event';

export function PrerequisiteBanner( { variant }: { variant: BannerVariant } ) {
    const content: Record< BannerVariant, JSX.Element > = {
        'no-site': (
            <>
                You haven&apos;t connected a site yet. Automations need an
                active site to enroll subscribers.{ ' ' }
                <Link to="/setup" className="font-medium underline">
                    Connect a site
                </Link>
                .
            </>
        ),
        'no-notifications': (
            <>
                You don&apos;t have any push notification messages yet. This
                template&apos;s Send step won&apos;t work until you create one.{ ' ' }
                <Link
                    to="/notifications/new?message=1"
                    className="font-medium underline"
                >
                    Create a message
                </Link>
                .
            </>
        ),
        'custom-event': (
            <>
                This automation triggers on a custom event. Make sure your
                WordPress site is configured to send this event via the
                NotifyPress API.
            </>
        ),
    };

    return (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{ content[ variant ] }</span>
        </div>
    );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function TemplatePreviewModal( {
    template,
    triggers,
    hasSite,
    onClose,
    onCreate,
}: {
    template: AutomationTemplate | null;
    triggers: Option[];
    hasSite: boolean;
    onClose: () => void;
    onCreate: ( template: AutomationTemplate ) => void;
} ) {
    const steps: AutomationStep[] = useMemo( () => {
        if ( ! template ) {
            return [];
        }

        return template.steps.map( ( s, i ) => ( {
            type: s.type,
            config: s.config,
            position_x: s.position_x,
            position_y: s.position_y,
            parent_step_id: null,
            branch: null,
            nodeId: `template-step-${ i }`,
        } ) );
    }, [ template ] );

    const triggerLabel =
        triggers.find( ( t ) => t.value === template?.trigger_type )?.label ??
        template?.trigger_type ??
        '';

    return (
        <Dialog
            open={ Boolean( template ) }
            onOpenChange={ ( open ) => {
                if ( ! open ) {
                    onClose();
                }
            } }
        >
            <DialogContent className="max-w-6xl">
                { template ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{ template.name }</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                            <div className="space-y-4 md:col-span-1">
                                <p className="text-sm text-muted-foreground">
                                    { template.description }
                                </p>
                                { ! hasSite ? (
                                    <PrerequisiteBanner variant="no-site" />
                                ) : null }
                                { hasSite && ! template.has_notifications ? (
                                    <PrerequisiteBanner variant="no-notifications" />
                                ) : null }
                                { template.is_custom_event ? (
                                    <PrerequisiteBanner variant="custom-event" />
                                ) : null }
                            </div>
                            <div className="h-[60vh] min-h-80 max-h-[40rem] overflow-hidden rounded-lg border md:col-span-3">
                                <AutomationCanvas
                                    steps={ steps }
                                    onChange={ () => {} }
                                    notifications={ [] }
                                    tags={ [] }
                                    triggerLabel={ triggerLabel }
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={ onClose }
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                disabled={ ! hasSite }
                                onClick={ () => onCreate( template ) }
                            >
                                Create automation
                            </Button>
                        </div>
                    </>
                ) : null }
            </DialogContent>
        </Dialog>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TemplatesGallery( { settings }: { settings: NotifyPressSettings } ) {
    const navigate = useNavigate();
    const [ category, setCategory ] = useState< 'popular' | 'all' >(
        'popular'
    );
    const [ previewing, setPreviewing ] = useState< AutomationTemplate | null >(
        null
    );

    const templatesQuery = useQuery( {
        queryKey: [ 'np-automation-templates', settings.apiToken ],
        queryFn: () =>
            laravelRequest< TemplatesResponse >(
                settings,
                '/automations/templates'
            ),
    } );

    const templates = templatesQuery.data?.data ?? [];
    const triggers = templatesQuery.data?.triggers ?? [];
    const hasSite = templatesQuery.data?.hasSite ?? true;

    const visible =
        category === 'all'
            ? templates
            : templates.filter( ( t ) => t.category === 'popular' );

    const handleCreate = ( template: AutomationTemplate ) => {
        navigate( `/automations/new/wizard?template=${ template.key }` );
    };

    if ( templatesQuery.isLoading ) {
        return <p className={ `${ ui.subtext } p-6` }>Loading…</p>;
    }

    if ( templatesQuery.isError ) {
        return (
            <div className="p-6">
                <div className={ ui.noticeError }>
                    { ( templatesQuery.error as Error ).message }
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <PageHeader
                title="Create an automation"
                description="Start from scratch or pick one of our pre-built automations."
                actions={
                    <>
                        <Button
                            asChild
                            variant="outline"
                            className="h-10 gap-2 px-4"
                        >
                            <Link to="/automations">
                                <ArrowLeft className="h-4 w-4" aria-hidden />
                                All automations
                            </Link>
                        </Button>
                        <Button asChild className="h-10 gap-2 px-4">
                            <Link to="/automations/new/wizard">
                                <Plus className="h-4 w-4" aria-hidden />
                                Create from scratch
                            </Link>
                        </Button>
                    </>
                }
            />

            { ! hasSite ? <PrerequisiteBanner variant="no-site" /> : null }

            <SectionCard
                title="Pre-built automations"
                description="Pick one to preview its steps, then customize it in the setup wizard."
                actions={
                    <SegmentedControl< 'popular' | 'all' >
                        value={ category }
                        onChange={ setCategory }
                        label="Pre-built automation type"
                        options={ [
                            { key: 'popular', label: 'Most popular' },
                            {
                                key: 'all',
                                label: 'All',
                                count: templates.length,
                            },
                        ] }
                    />
                }
            >
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    { visible.map( ( template ) => (
                        <TemplateCard
                            key={ template.key }
                            template={ template }
                            onClick={ () => setPreviewing( template ) }
                            showPopular={ category === 'all' }
                        />
                    ) ) }
                </div>
            </SectionCard>

            <TemplatePreviewModal
                template={ previewing }
                triggers={ triggers }
                hasSite={ hasSite }
                onClose={ () => setPreviewing( null ) }
                onCreate={ handleCreate }
            />
        </div>
    );
}

export default function AutomationTemplatesPage() {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    const settings = settingsQuery.data;

    if ( ! settings ) {
        return <p className={ ui.subtext }>Loading…</p>;
    }

    return <TemplatesGallery settings={ settings } />;
}
