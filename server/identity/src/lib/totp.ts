import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';

// RFC 6238 TOTP (SHA-1, 6 digits, 30 s), what every authenticator app speaks.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const PERIOD_SECONDS = 30;

export function base32Encode(buf: Buffer) {
    let bits = '';
    for (const byte of buf) bits += byte.toString(2).padStart(8, '0');
    return (bits.match(/.{1,5}/g) ?? []).map((c) => ALPHABET[parseInt(c.padEnd(5, '0'), 2)]).join('');
}

export function base32Decode(s: string) {
    const bits = [...s.replace(/=+$/, '').toUpperCase()].map((c) => ALPHABET.indexOf(c).toString(2).padStart(5, '0')).join('');
    return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

export function hotp(key: Buffer, counter: number, digits = 6) {
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(counter));
    const mac = createHmac('sha1', key).update(msg).digest();
    const offset = mac[mac.length - 1] & 0xf;
    const n = mac.readUInt32BE(offset) & 0x7fffffff;
    return String(n % 10 ** digits).padStart(digits, '0');
}

export const timeStep = (ms = Date.now()) => Math.floor(ms / 1000 / PERIOD_SECONDS);

/** The time step `code` matches (allowing one step of clock drift either way), or null. */
export function verifyTotp(secret: string, code: string, ms = Date.now()) {
    if (!/^\d{6}$/.test(code)) return null;
    const key = base32Decode(secret);
    for (const step of [timeStep(ms), timeStep(ms) - 1, timeStep(ms) + 1]) {
        if (timingSafeEqual(Buffer.from(hotp(key, step)), Buffer.from(code))) return step;
    }
    return null;
}

export const generateSecret = () => base32Encode(randomBytes(20));

export const otpauthUrl = (secret: string, account: string, issuer = 'HMS') =>
    `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?` +
    new URLSearchParams({secret, issuer, algorithm: 'SHA1', digits: '6', period: String(PERIOD_SECONDS)});
