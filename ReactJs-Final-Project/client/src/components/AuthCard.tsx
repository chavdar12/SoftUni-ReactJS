import type {ReactNode} from 'react';
import {Box, Paper, Typography} from '@mui/material';
import bg from '@/assets/bg-4.jpg';

/** Centered card over the background image, used by the login/signup pages. */
export default function AuthCard({title, children}: {title: string; children: ReactNode}) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                p: 2,
                background: `url(${bg}) center / cover no-repeat`,
            }}
        >
            <Paper sx={{p: 4, width: '100%', maxWidth: 420}} elevation={6}>
                <Typography variant="h5" component="h1" gutterBottom>
                    {title}
                </Typography>
                {children}
            </Paper>
        </Box>
    );
}
