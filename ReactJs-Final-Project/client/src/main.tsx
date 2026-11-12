import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import {CssBaseline} from '@mui/material';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './api/queryClient';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <CssBaseline/>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>,
);
