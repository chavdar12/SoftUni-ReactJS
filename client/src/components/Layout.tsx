import {NavLink, Outlet} from 'react-router';
import {AppBar, Box, Button, Container, Toolbar, Typography, useColorScheme} from '@mui/material';
import {useAuth} from '@/auth/useAuth';
import {useLogout} from '@/api/hooks';
import {useLiveUpdates} from '@/api/live';

/** App bar with role navigation; `links` is [{ to, label }]. */
export default function Layout({links}: {links: {to: string; label: string}[]}) {
    const {profile} = useAuth();
    const logout = useLogout();
    const {mode, systemMode, setMode} = useColorScheme();
    const dark = (mode === 'system' ? systemMode : mode) === 'dark';
    useLiveUpdates(!!profile);

    return (
        <>
            <AppBar position="static" className="no-print">
                <Toolbar sx={{gap: 1, flexWrap: 'wrap'}}>
                    <Typography variant="h6" sx={{mr: 2}}>
                        HMS
                    </Typography>
                    <Box component="nav" sx={{flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: 1}}>
                        {links.map((l) => (
                            <Button
                                key={l.to}
                                component={NavLink}
                                to={l.to}
                                color="inherit"
                                sx={{'&.active': {textDecoration: 'underline'}}}
                            >
                                {l.label}
                            </Button>
                        ))}
                    </Box>
                    <Button color="inherit" onClick={() => setMode(dark ? 'light' : 'dark')}>
                        {dark ? 'Light mode' : 'Dark mode'}
                    </Button>
                    <Button component={NavLink} to={`/${profile?.role}/profile`} color="inherit">
                        {profile?.name}
                    </Button>
                    <Button color="inherit" onClick={() => logout.mutate()}>
                        Log out
                    </Button>
                </Toolbar>
            </AppBar>
            <Container sx={{py: 4}}>
                <Outlet/>
            </Container>
        </>
    );
}
