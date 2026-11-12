import {issueRefreshToken, signAccessToken} from '#identity/lib/tokens.ts';
import {toUserDto} from '#identity/dto/user.dto.ts';
import type {SessionDto} from '#identity/dto/auth.dto.ts';
import type {UserDoc} from '#identity/repositories/user.repository.ts';

/** A new session: the body for the client, and the refresh token the controller puts in a cookie. */
export interface IssuedSession {
    session: SessionDto;
    refreshToken: string;
}

export const accessTokenFor = (user: UserDoc) =>
    signAccessToken({id: user.id, role: user.role as never, name: user.name, email: user.email});

export async function startSession(user: UserDoc): Promise<IssuedSession> {
    return {
        refreshToken: await issueRefreshToken(user.id),
        session: {accessToken: accessTokenFor(user), user: toUserDto(user)},
    };
}
