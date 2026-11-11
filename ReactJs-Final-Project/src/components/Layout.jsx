import {NavLink, Outlet} from 'react-router';
import {AppBar, Box, Button, Container, Toolbar, Typography} from '@mui/material';
import {useAuth} from '../auth/AuthProvider';
import {logout} from '../api';

/** App bar with role navigation; `links` is [{ to, label }]. */
export default function Layout({links}) {
    const {profile} = useAuth();

    return (
        <>
            <AppBar position="static">
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
                    <Typography variant="body2">{profile?.name}</Typography>
                    <Button color="inherit" onClick={logout}>
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
