import React from 'react'
import { Link,Typography } from '@material-ui/core';

function Copyright (){
    return (
        <Typography variant="body2" color="textSecondary" align="center">
            {'Copyright © SoftUni ' + new Date().getFullYear() + 'Chavdar Shishkov'}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    );
}

export default Copyright
