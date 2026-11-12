import {E164, splitE164, toE164} from './phone';

test('builds E.164 from a country code and what people type', () => {
    expect(toE164('359', '0888 123-456')).toBe('+359888123456');
    expect(toE164('44', '7700 900123')).toBe('+447700900123');
    expect(toE164('359', '   ')).toBe('');
    expect(E164.test(toE164('359', '0888123456'))).toBe(true);
    expect(E164.test(toE164('359', '12'))).toBe(false);
});

test('splits a stored number back into country and national part', () => {
    expect(splitE164('+359888123456')).toEqual({iso: 'BG', national: '888123456'});
    expect(splitE164('+3584012345')).toEqual({iso: 'FI', national: '4012345'}); // 358 beats 35x prefixes
    expect(splitE164('0888 10 00')).toEqual({iso: 'BG', national: '0888 10 00'}); // legacy free text
    expect(splitE164(undefined)).toEqual({iso: 'BG', national: ''});
});
