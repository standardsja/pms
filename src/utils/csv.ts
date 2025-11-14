export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>, filename: string, addBom = true) {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    const needsQuotes = /[",\n\r]/.test(s) || s.includes(',');
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blobParts: (ArrayBuffer | string)[] = [];
  if (addBom) blobParts.push('\uFEFF'); // Excel-friendly BOM
  blobParts.push(csv);
  const blob = new Blob(blobParts, { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
