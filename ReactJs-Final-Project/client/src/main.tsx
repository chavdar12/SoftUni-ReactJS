import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import {CssBaseline, GlobalStyles, ThemeProvider, createTheme} from '@mui/material';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './api/queryClient';
import App from './App';

// Light/dark follows the OS until the user picks one; MUI remembers the choice in localStorage.
const theme = createTheme({colorSchemes: {dark: true}});

// When a .printable element is open (e.g. a prescription), print only that.
const printStyles = {
    '@media print': {
        'body:has(.printable) *': {visibility: 'hidden'},
        '.printable, .printable *': {visibility: 'visible'},
        '.printable': {position: 'absolute', inset: 0},
        '.no-print': {display: 'none !important'},
    },
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <GlobalStyles styles={printStyles}/>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App/>
                </BrowserRouter>
            </QueryClientProvider>
        </ThemeProvider>
    </StrictMode>,
);
