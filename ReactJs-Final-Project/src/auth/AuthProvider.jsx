import {createContext, use, useEffect, useState} from 'react';
import {onAuthChange, watchProfile} from '../api';

const AuthContext = createContext(null);

/** Provides { loading, user, profile } where profile is the users/{uid} doc plus `uid`. */
export function AuthProvider({children}) {
    const [state, setState] = useState({loading: true, user: null, profile: null});

    useEffect(() => {
        let stopProfile = () => {
        };
        const stopAuth = onAuthChange((user) => {
            stopProfile();
            if (!user) return setState({loading: false, user: null, profile: null});
            stopProfile = watchProfile(user.uid, (data) =>
                setState({loading: false, user, profile: data && {uid: user.uid, ...data}}),
            );
        });
        return () => {
            stopAuth();
            stopProfile();
        };
    }, []);

    return <AuthContext value={state}>{children}</AuthContext>;
}

export const useAuth = () => use(AuthContext);
