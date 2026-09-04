// A word-level diff of the two reason texts. A coached sender resubmits with
// softer wording within minutes of a rejection; showing both side by side is
// what makes that visible.

type Token = { text: string; kind: 'same' | 'removed' | 'added' };

function tokenise(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/** Longest common subsequence over word tokens. */
export function diffWords(before: string, after: string): Token[] {
  const a = tokenise(before);
  const b = tokenise(after);
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i].toLowerCase() === b[j].toLowerCase()
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: Token[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i].toLowerCase() === b[j].toLowerCase()) {
      out.push({ text: a[i], kind: 'same' });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ text: a[i], kind: 'removed' });
      i++;
    } else {
      out.push({ text: b[j], kind: 'added' });
      j++;
    }
  }
  while (i < a.length) out.push({ text: a[i++], kind: 'removed' });
  while (j < b.length) out.push({ text: b[j++], kind: 'added' });
  return out;
}

export function ReasonDiff({ before, after }: { before: string; after: string }) {
  const tokens = diffWords(before, after);
  return (
    <div className="rounded-lg border-2 border-slate-400 bg-white p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">
        Wording before and after (removed, added)
      </p>
      <p className="leading-8">
        {tokens.map((token, index) => {
          if (token.kind === 'same') return <span key={index}>{token.text}</span>;
          if (token.kind === 'removed') {
            return (
              <s key={index} className="bg-red-100 text-red-900 decoration-red-700">
                {token.text}
              </s>
            );
          }
          return (
            <mark key={index} className="bg-emerald-100 font-semibold text-emerald-950">
              {token.text}
            </mark>
          );
        })}
      </p>
    </div>
  );
}
