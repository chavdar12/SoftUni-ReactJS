import {useState} from 'react';

/** Form submit handler: passes the form's fields as an object to `fn` and tracks busy/error/message. */
export default function useSubmit(fn, successMessage = '') {
    const [state, setState] = useState({busy: false, error: '', message: ''});

    const onSubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setState({busy: true, error: '', message: ''});
        try {
            await fn(Object.fromEntries(new FormData(form)), form);
            setState({busy: false, error: '', message: successMessage});
        } catch (err) {
            setState({busy: false, error: err.message, message: ''});
        }
    };

    return {onSubmit, ...state};
}
