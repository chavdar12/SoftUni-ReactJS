import {createCipheriv, createDecipheriv, hkdfSync, randomBytes} from 'node:crypto';
import {config} from '#shared/config.ts';

// Authenticator secrets are encrypted at rest (AES-256-GCM), so a database dump alone can't generate codes.
// The key is derived from JWT_SECRET: rotating that secret makes users set up their authenticator again.
const key = Buffer.from(hkdfSync('sha256', config.jwtSecret, 'hms', 'totp-secret-box', 32));

export function seal(plain: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function open(sealed: string) {
    const [iv, tag, data] = sealed.split('.').map((s) => Buffer.from(s, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
