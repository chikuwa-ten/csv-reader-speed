export function run(input) {
  const t = String(input.text), header = input.header === true, n = t.length;
  const errors = [], rows = [];
  let columns = null, width = -1, pos = n > 0 && t.charCodeAt(0) === 0xfeff ? 1 : 0, line = 1;
  let nc = -1, nl = -1, nr = -1, nq = -1;
  for (;;) {
    while (pos < n) {
      const c = t.charCodeAt(pos);
      if (c === 10) pos++;
      else if (c === 13 && t.charCodeAt(pos + 1) === 10) pos += 2;
      else break;
      line++;
    }
    if (pos >= n) break;
    const rl = line, rr = header && columns === null ? null : rows.length, f = [];
    let q = false, end;
    do {
      let v, pre = null, junk = false;
      end = 2;
      q = t.charCodeAt(pos) === 34;
      if (q) {
        const o = pos;
        let p = o + 1, s = p, qv = '', ln = line, ok = false;
        for (;;) {
          if (nq < p) { nq = t.indexOf('"', p); if (nq < 0) nq = n; }
          if (nq >= n) break;
          if (nr < p) { nr = t.indexOf('\r', p); if (nr < 0) nr = n; }
          if (nl < p) { nl = t.indexOf('\n', p); if (nl < 0) nl = n; }
          if (nq < nr && nq < nl) {
            if (t.charCodeAt(nq + 1) === 34) { qv += t.slice(s, nq + 1); s = p = nq + 2; continue; }
            qv += t.slice(s, nq);
            p = nq + 1;
            ok = true;
            break;
          }
          if (nr < nl) {
            qv += t.slice(s, nr) + '\n';
            ln++;
            s = p = t.charCodeAt(nr + 1) === 10 ? nr + 2 : nr + 1;
          } else {
            ln++;
            p = nl + 1;
          }
        }
        if (!ok) {
          pos = o + 1;
          nc = nl = nr = nq = -1;
          errors.push({ code: 'unterminated_quote', line: rl, row: rr });
          pre = '"';
        } else {
          pos = p;
          line = ln;
          const c = t.charCodeAt(p);
          if (p >= n) v = qv;
          else if (c === 44) { pos++; v = qv; end = 0; }
          else if (c === 10) { pos++; line++; v = qv; end = 1; }
          else if (c === 13 && t.charCodeAt(p + 1) === 10) { pos += 2; line++; v = qv; end = 1; }
          else { pre = qv; junk = true; }
        }
      }
      if (v === undefined) {
        let s = pos, k = 0;
        for (;;) {
          if (nc < pos) { nc = t.indexOf(',', pos); if (nc < 0) nc = n; }
          if (nl < pos) { nl = t.indexOf('\n', pos); if (nl < 0) nl = n; }
          if (nr < pos) { nr = t.indexOf('\r', pos); if (nr < 0) nr = n; }
          if (nc < nl && nc < nr) { pos = nc; end = 0; break; }
          if (nl < nr) { pos = nl; end = nl < n ? 1 : 2; break; }
          if (nr >= n) { pos = n; break; }
          if (t.charCodeAt(nr + 1) === 10) { pos = nr; end = 1; break; }
          errors.push({ code: 'stray_cr', line: rl, row: rr });
          k += nr - s;
          pre = pre === null ? t.slice(s, nr) : pre + t.slice(s, nr);
          s = pos = nr + 1;
        }
        k += pos - s;
        v = pre === null ? t.slice(s, pos) : pre + t.slice(s, pos);
        if (end === 0) pos++;
        else if (end === 1) { pos += t.charCodeAt(pos) === 13 ? 2 : 1; line++; }
        if (junk && k > 0) errors.push({ code: 'quote_junk', line: rl, row: rr });
      }
      f.push(v);
    } while (end === 0);
    const len = f.length;
    if (len === 1 && !q && f[0] === '') continue;
    if (width < 0) width = len;
    if (header && columns === null) { columns = f; continue; }
    if (len < width) {
      errors.push({ code: 'short_row', line: rl, row: rr, fields: len });
      while (f.length < width) f.push('');
    } else if (len > width) {
      errors.push({ code: 'long_row', line: rl, row: rr, extra: f.splice(width) });
    }
    rows.push(f);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
