import {useSession} from '../api/hooks';

/** { loading, profile } where profile is the signed-in user or null. */
export function useAuth() {
    const {data, isPending} = useSession();
    return {loading: isPending, profile: data ?? null};
}
