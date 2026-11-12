/** Countries offered in the phone picker: ISO code, name, dialling code. Bulgaria first (the default). */
export const COUNTRIES = [
    ['BG', 'Bulgaria', '359'], ['AT', 'Austria', '43'], ['BE', 'Belgium', '32'], ['HR', 'Croatia', '385'],
    ['CY', 'Cyprus', '357'], ['CZ', 'Czechia', '420'], ['DK', 'Denmark', '45'], ['EE', 'Estonia', '372'],
    ['FI', 'Finland', '358'], ['FR', 'France', '33'], ['DE', 'Germany', '49'], ['GR', 'Greece', '30'],
    ['HU', 'Hungary', '36'], ['IE', 'Ireland', '353'], ['IT', 'Italy', '39'], ['LV', 'Latvia', '371'],
    ['LT', 'Lithuania', '370'], ['MK', 'North Macedonia', '389'], ['NL', 'Netherlands', '31'], ['NO', 'Norway', '47'],
    ['PL', 'Poland', '48'], ['PT', 'Portugal', '351'], ['RO', 'Romania', '40'], ['RS', 'Serbia', '381'],
    ['SK', 'Slovakia', '421'], ['SI', 'Slovenia', '386'], ['ES', 'Spain', '34'], ['SE', 'Sweden', '46'],
    ['CH', 'Switzerland', '41'], ['TR', 'Türkiye', '90'], ['UA', 'Ukraine', '380'], ['GB', 'United Kingdom', '44'],
    ['US', 'United States', '1'], ['CA', 'Canada', '1'], ['AU', 'Australia', '61'], ['IN', 'India', '91'],
].map(([iso, name, dial]) => ({iso, name, dial}));

export const E164 = /^\+[1-9]\d{6,14}$/;

const flag = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));
export const countryLabel = (c: (typeof COUNTRIES)[number]) => `${flag(c.iso)} ${c.name} (+${c.dial})`;

/** "+<dial><number>", dropping spaces, dashes and the trunk 0 people type at home ("0888…" -> "+359888…"). */
export function toE164(dial: string, national: string) {
    const digits = national.replace(/\D/g, '').replace(/^0+/, '');
    return digits ? `+${dial}${digits}` : '';
}

/** Splits a stored number back into picker country + national part (longest matching dialling code). */
export function splitE164(phone: string | undefined | null) {
    if (!phone?.startsWith('+')) return {iso: COUNTRIES[0].iso, national: phone ?? ''};
    const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => phone.startsWith(`+${c.dial}`));
    return match ? {iso: match.iso, national: phone.slice(match.dial.length + 1)} : {iso: COUNTRIES[0].iso, national: phone.slice(1)};
}
