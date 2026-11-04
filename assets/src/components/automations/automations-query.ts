import { laravelRequest } from '../../lib/api';
import type { Automation, NotifyPressSettings } from '../../types';

// The Workflows list request, shared by the list itself and the Messages
// page's hover prefetch so both use the same query key.

/**
 * GET /automations: a Laravel page-number paginator, plus the site-wide tab
 * counts and the paid flag.
 */
export interface AutomationsListResponse {
    data: Automation[];
    current_page: number;
    last_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
    total: number;
    isPaidUser?: boolean;
    statusCounts?: {
        all: number;
        active: number;
        paused: number;
        inactive: number;
    };
}

export type AutomationStatusFilter = 'all' | 'active' | 'paused' | 'draft';

/**
 * The list's query key and request. The unfiltered first page is
 * `[ 'np-automations', apiToken, 'all', '', 1 ]`.
 *
 * @param  settings Plugin settings (API token).
 * @param  status   Status tab, or 'all'.
 * @param  q        Search text, already trimmed.
 * @param  page     Page number, from 1.
 * @return {Object} The query key and function.
 */
export function automationsListQuery(
    settings: NotifyPressSettings,
    status: AutomationStatusFilter = 'all',
    q = '',
    page = 1
) {
    return {
        queryKey: [ 'np-automations', settings.apiToken, status, q, page ],
        queryFn: () =>
            laravelRequest< AutomationsListResponse >(
                settings,
                '/automations',
                {
                    query: {
                        status: status === 'all' ? undefined : status,
                        q: q || undefined,
                        page,
                    },
                }
            ),
    };
}
