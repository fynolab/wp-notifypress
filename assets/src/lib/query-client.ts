import { QueryClient } from '@tanstack/react-query';
import { isUnauthorizedError } from './api';

export const queryClient = new QueryClient( {
    defaultOptions: {
        queries: {
            retry: ( failureCount, error ) => {
                if ( isUnauthorizedError( error ) ) {
                    return false;
                }

                return failureCount < 1;
            },
            staleTime: 30000,
            refetchOnWindowFocus: false,
        },
    },
} );
