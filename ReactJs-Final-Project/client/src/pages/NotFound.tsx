import {Link} from 'react-router';
import {Box, Button, Typography} from '@mui/material';
import gif from '@/assets/404.gif';

export default function NotFound() {
    return (
        <Box sx={{textAlign: 'center', p: 4}}>
            <Typography variant="h4" component="h1">
                Page not found
            </Typography>
            <Box component="img" src={gif} alt="" sx={{maxWidth: '100%', my: 2}}/>
            <div>
                <Button component={Link} to="/" variant="contained">
                    Go home
                </Button>
            </div>
        </Box>
    );
}
