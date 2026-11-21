// A faster drop-in for csv-reader 1.0.0's readCsv: run(input) returns the same {columns, rows, errors} for every
// input {text, header}. Same policy, read once left to right, but in one flat loop (no closures, so the position and
// line stay in registers), with every field taken as a slice of the text rather than built a character at a time.
// Errors are pushed exactly where csv-reader pushes them, so they come in the same order.

const QUOTE = 34; // "
const COMMA = 44; // ,
const LF = 10;
const CR = 13;

const E_COMMA = 0;
const E_BREAK = 1;
const E_END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = n > 0 && text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === LF) {
        pos += 1;
        line += 1;
      } else if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    const recordLine = line;
    const recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended = E_END;

    for (;;) {
      let value;
      let prefix = null; // text an unquoted read continues (a closed quoted field's value, or a lone quote)
      let junk = false; // the unquoted read is a quoted field's junk: quote_junk if it keeps a character
      quoted = pos < n && text.charCodeAt(pos) === QUOTE;

      if (quoted) {
        const open = pos;
        let p = open + 1;
        let seg = p;
        let qv = '';
        let ln = line;
        let closed = false;
        while (p < n) {
          const c = text.charCodeAt(p);
          if (c > QUOTE) {
            p += 1;
            continue;
          }
          if (c === QUOTE) {
            if (p + 1 < n && text.charCodeAt(p + 1) === QUOTE) {
              qv += text.slice(seg, p + 1);
              p += 2;
              seg = p;
              continue;
            }
            qv += text.slice(seg, p);
            p += 1;
            closed = true;
            break;
          }
          if (c === CR) {
            qv += text.slice(seg, p) + '\n';
            ln += 1;
            p += p + 1 < n && text.charCodeAt(p + 1) === LF ? 2 : 1;
            seg = p;
            continue;
          }
          if (c === LF) ln += 1;
          p += 1;
        }
        if (!closed) {
          // The quote never closes: a literal character, and the text after it is read again as unquoted.
          pos = open + 1;
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
          prefix = '"';
        } else {
          pos = p;
          line = ln;
          if (p >= n) {
            value = qv;
            ended = E_END;
          } else {
            const c = text.charCodeAt(p);
            if (c === COMMA) {
              pos = p + 1;
              value = qv;
              ended = E_COMMA;
            } else if (c === LF) {
              pos = p + 1;
              line += 1;
              value = qv;
              ended = E_BREAK;
            } else if (c === CR && p + 1 < n && text.charCodeAt(p + 1) === LF) {
              pos = p + 2;
              line += 1;
              value = qv;
              ended = E_BREAK;
            } else {
              // What follows the closing quote is appended as it stands, up to the next comma or line break.
              prefix = qv;
              junk = true;
            }
          }
        }
      }

      if (value === undefined) {
        // An unquoted read up to the next comma or line break; a CR not followed by LF is dropped (stray_cr).
        let start = pos;
        let kept = 0;
        ended = E_END;
        while (pos < n) {
          const c = text.charCodeAt(pos);
          if (c > COMMA) {
            pos += 1;
            continue;
          }
          if (c === COMMA) {
            ended = E_COMMA;
            break;
          }
          if (c === LF) {
            ended = E_BREAK;
            break;
          }
          if (c === CR) {
            if (pos + 1 < n && text.charCodeAt(pos + 1) === LF) {
              ended = E_BREAK;
              break;
            }
            errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
            kept += pos - start;
            prefix = prefix === null ? text.slice(start, pos) : prefix + text.slice(start, pos);
            pos += 1;
            start = pos;
            continue;
          }
          pos += 1;
        }
        kept += pos - start;
        value = prefix === null ? text.slice(start, pos) : prefix + text.slice(start, pos);
        if (ended === E_COMMA) {
          pos += 1;
        } else if (ended === E_BREAK) {
          pos += text.charCodeAt(pos) === CR ? 2 : 1;
          line += 1;
        }
        if (junk && kept > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
      }

      fields.push(value);
      if (ended !== E_COMMA) break;
    }

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && !quoted && fields[0] === '') continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    const len = fields.length;
    if (len < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: len });
      for (let i = len; i < width; i++) fields.push('');
    } else if (len > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
