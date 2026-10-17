/** Quotes a value for CSV when it needs it; a leading =, +, - or @ is escaped so spreadsheets don't run it. */
function cell(value: string | number): string {
  let text = String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** The rows as CSV text, a header row first. */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n')
}

/** Saves the rows as a CSV file the user downloads. */
export function downloadCsv(filename: string, rows: readonly (readonly (string | number)[])[]) {
  // The byte-order mark lets Excel read the file as UTF-8.
  const blob = new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
