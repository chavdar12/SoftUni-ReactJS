import type {ReactNode} from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

/** Renders `ui` inside a router and a fresh, no-retry QueryClient. */
export const renderWithProviders = (ui: ReactNode) =>
    render(
        <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
            <MemoryRouter>{ui}</MemoryRouter>
        </QueryClientProvider>,
    );
