import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import {CssBaseline} from '@mui/material';
import {AuthProvider} from './auth/AuthProvider';
import App from './App';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <CssBaseline/>
        <AuthProvider>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>,
);
