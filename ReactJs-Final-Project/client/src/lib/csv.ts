/** RFC 4180 CSV of `rows` in `columns` order. Cells starting with = + - @ are prefixed with ' so
 *  spreadsheets don't run them as formulas (CSV injection). */
export function toCsv<T>(rows: T[], columns: {id: keyof T & string; label: string}[]) {
    const cell = (v: unknown) => {
        let s = v == null ? '' : String(v);
        if (/^[=+\-@]/.test(s)) s = `'${s}`;
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [columns.map((c) => cell(c.label)), ...rows.map((r) => columns.map((c) => cell(r[c.id])))]
        .map((line) => line.join(','))
        .join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
    const a = Object.assign(document.createElement('a'), {href: url, download: filename});
    a.click();
    URL.revokeObjectURL(url);
}
