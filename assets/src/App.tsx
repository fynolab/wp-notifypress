import type { ReactNode } from 'react';
import { useLayoutEffect, useState } from '@wordpress/element';
import { flushSync } from 'react-dom';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Shell from './components/shell';
import AnalyticsPage from './pages/analytics';
import AutomationsPage from './pages/automations';
import AutomationMessagesPage from './pages/automations-messages';
import AutomationTemplatesPage from './pages/automations-templates';
import AutomationWizardPage from './pages/automations-wizard';
import DashboardPage from './pages/dashboard';
import NotificationsPage from './pages/notifications';
import ReportsPage from './pages/reports';
import SubscribersPage from './pages/subscribers';
import SegmentsPage from './pages/segments';
import SettingsPage from './pages/settings';
import SetupPage from './pages/setup';
import { getBootstrapSettings, getSettings } from './lib/settings';

// The SaaS app navigates with Inertia's `viewTransition: true`, which wraps
// each page swap in document.startViewTransition() (browser cross-fade). React
// Router's own viewTransition support needs a data router, so emulate it:
// keep rendering the previous location, snapshot it, then flush the new
// location inside the transition callback.
function ViewTransitionRoutes( { children }: { children: ReactNode } ) {
    const location = useLocation();
    const [ displayLocation, setDisplayLocation ] = useState( location );

    useLayoutEffect( () => {
        if ( location === displayLocation ) {
            return;
        }

        const doc = document as Document & {
            startViewTransition?: ( callback: () => void ) => void;
        };

        if ( typeof doc.startViewTransition !== 'function' ) {
            setDisplayLocation( location );
            return;
        }

        doc.startViewTransition( () => {
            flushSync( () => setDisplayLocation( location ) );
        } );
    }, [ location, displayLocation ] );

    return <Routes location={ displayLocation }>{ children }</Routes>;
}

function RequireSetupCompleted( { children }: { children: ReactNode } ) {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
        initialData: getBootstrapSettings(),
    } );
    const setupCompleted = Boolean( settingsQuery.data?.setupCompleted );

    if ( ! setupCompleted ) {
        return <Navigate to="/setup" replace />;
    }

    return children;
}

export default function App() {
    return (
        <Shell>
            <ViewTransitionRoutes>
                <Route
                    path="/"
                    element={ <Navigate to="/dashboard" replace /> }
                />
                <Route path="/setup" element={ <SetupPage /> } />
                <Route
                    path="/dashboard"
                    element={
                        <RequireSetupCompleted>
                            <DashboardPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/subscribers"
                    element={
                        <RequireSetupCompleted>
                            <SubscribersPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/segments"
                    element={
                        <RequireSetupCompleted>
                            <SegmentsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/segments/new"
                    element={
                        <RequireSetupCompleted>
                            <SegmentsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/segments/:segmentId/edit"
                    element={
                        <RequireSetupCompleted>
                            <SegmentsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/notifications"
                    element={
                        <RequireSetupCompleted>
                            <NotificationsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/notifications/new"
                    element={
                        <RequireSetupCompleted>
                            <NotificationsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/notifications/:notificationId/edit"
                    element={
                        <RequireSetupCompleted>
                            <NotificationsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/analytics"
                    element={
                        <RequireSetupCompleted>
                            <AnalyticsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <RequireSetupCompleted>
                            <ReportsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/automations"
                    element={
                        <RequireSetupCompleted>
                            <AutomationsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/automations/messages"
                    element={
                        <RequireSetupCompleted>
                            <AutomationMessagesPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/automations/templates"
                    element={
                        <RequireSetupCompleted>
                            <AutomationTemplatesPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/automations/new/wizard"
                    element={
                        <RequireSetupCompleted>
                            <AutomationWizardPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/automations/new"
                    element={
                        <RequireSetupCompleted>
                            <AutomationsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route
                    path="/automations/:automationId/edit"
                    element={
                        <RequireSetupCompleted>
                            <AutomationsPage />
                        </RequireSetupCompleted>
                    }
                />
                <Route path="/settings" element={ <SettingsPage /> } />
            </ViewTransitionRoutes>
        </Shell>
    );
}
