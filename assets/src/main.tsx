import { createRoot, render } from '@wordpress/element';
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { Toaster } from './components/ui/sonner';
import { queryClient } from './lib/query-client';
import './scss/style.scss';

const node = document.getElementById( 'notifypress' );
const tree = (
    <QueryClientProvider client={ queryClient }>
        <HashRouter>
            <App />
        </HashRouter>
        <Toaster />
    </QueryClientProvider>
);

if ( node && typeof createRoot === 'function' ) {
    createRoot( node ).render( tree );
} else if ( node ) {
    render( tree, node );
}
