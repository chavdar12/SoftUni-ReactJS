import {test} from 'node:test';
import assert from 'node:assert/strict';
import {open, seal} from './secretBox.ts';

test('round-trips, is randomized, and rejects tampering', () => {
    const a = seal('JBSWY3DPEHPK3PXP');
    assert.equal(open(a), 'JBSWY3DPEHPK3PXP');
    assert.notEqual(seal('JBSWY3DPEHPK3PXP'), a);
    const [iv, tag, data] = a.split('.');
    const flipped = Buffer.from(data, 'base64url');
    flipped[0] ^= 1;
    assert.throws(() => open([iv, tag, flipped.toString('base64url')].join('.')));
});
