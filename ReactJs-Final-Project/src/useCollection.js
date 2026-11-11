import {useEffect, useState} from 'react';
import {subscribe} from './api';

/** Live rows of a Firestore collection, optionally filtered by `field == value`. */
export default function useCollection(name, field, value) {
    const [state, setState] = useState({rows: [], loading: true, error: ''});

    useEffect(
        () =>
            subscribe(
                name,
                field,
                value,
                (rows) => setState({rows, loading: false, error: ''}),
                (err) => setState({rows: [], loading: false, error: err.message}),
            ),
        [name, field, value],
    );

    return state;
}
