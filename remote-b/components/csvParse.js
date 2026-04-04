// turn one csv text line into an array of cell strings (quotes + commas rules)
export function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (c === "," && !inQuotes) {
      cells.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  cells.push(cur.trim());
  return cells;
}

// full file: first line = headers, rest = data rows
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const table = lines.map(parseCsvLine);
  const headers = table[0] || [];
  const rows = table.slice(1);
  return { headers, rows };
}
