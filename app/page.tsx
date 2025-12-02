// /app/kmap/page.tsx
'use client';
import React, { useMemo, useState } from 'react';
import { FaCheck, FaCopy, FaRegCopyright,  } from 'react-icons/fa';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200); // reset after 1.2s
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <button suppressHydrationWarning={true}
      onClick={handleCopy}
      className={`
        text-xs transition-all cursor-pointer
        ${copied ? "text-emerald-400" : "text-neutral-300 hover:text-neutral-100"}
        active:opacity-60
      `}
    >
      {copied ? (
        <FaCheck className="animate-scaleIn" />
      ) : (
        <FaCopy className="opacity-80 hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

type Result = {
  expression: string;
  latex: string;
  selectedImplicants: { bits: string; covered: number[] }[];
};

export default function KMapPage() {
  const [numInputs, setNumInputs] = useState(4);
  const [minterms, setMinterms] = useState('0,2,5,7,8,10,13,15');
  const [dontCares, setDontCares] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const inputCommon =
    'w-full rounded-xl border border-neutral-700 bg-neutral-900/70 px-3 py-2 text-neutral-100 placeholder-neutral-400 ' +
    'shadow-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-600/50';

  const labelCommon = 'text-sm border-white text-neutral-300 mb-1 block';

 const run = async () => {
  setError(null);
  setResult(null);

  // Parse once
  const mts = parseList(minterms);
  const dcs = parseList(dontCares);
  const all = [...mts, ...dcs];

  // Basic integer & non-negative check
  if (all.some((m) => !Number.isInteger(m) || m < 0)) {
    setError('Minterms and don’t-cares must be non-negative integers.');
    return;
  }

  // If there are no indices at all, just let backend handle "empty" case
  if (all.length > 0) {
    const maxIndex = Math.max(...all);
    const maxAllowed = (1 << numInputs) - 1;

    if (maxIndex > maxAllowed) {
      const requiredInputs = Math.ceil(Math.log2(maxIndex + 1));
      setError(
        `Index m${maxIndex} is out of range for ${numInputs} inputs (valid 0–${maxAllowed}). ` +
          `Use at least ${requiredInputs} inputs or reduce your indices.`
      );
      return;
    }
  }

  setIsRunning(true);
  try {
    const res = await fetch('/api/kmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numInputs,
        minterms: mts,
        dontCares: dcs,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    setResult(json as Result);
  } catch (e: any) {
    setError(e.message);
  } finally {
    setIsRunning(false);
  }
};


  const submit: React.FormEventHandler = (e) => {
    e.preventDefault();
    run();
  };

  const numInputOptions = useMemo(() => [2, 3, 4, 5, 6], []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">K-Map (SOP) Solver</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Enter minterms / don&apos;t cares and solve for a simplified SOP expression. Supports 2–6 inputs.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-s-blue-300 bg-neutral-900/60 p-6 shadow-lg shadow-black/30">
          <form onSubmit={submit} className="space-y-5">
            {/* Number of Inputs (Dropdown) */}
            <div>
              <label className={labelCommon}>Number of inputs (A, B, C, D, E, F)</label>
              <div className="relative">
                <select
                  value={numInputs}
                  onChange={(e) => setNumInputs(parseInt(e.target.value, 10))}
                  className={inputCommon + ' appearance-none pr-10 cursor-pointer'}
                >
                  {numInputOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">
                  ▾
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">Choose from 2 to 6 variables.</p>
            </div>

            {/* Minterms */}
            <div>
  <label className={labelCommon}>
    <span className="font-mono text-lg mr-1">Σ</span> Minterms (comma-separated)
  </label>

  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono">
      m
    </span>
    <input
      type="text"
      value={minterms}
      onChange={(e) => setMinterms(e.target.value)}
      placeholder="0,2,5,7..."
      className={inputCommon + " pl-7"}   // ← give input padding so m isn't overlapped
      autoComplete="off"
    />
  </div>
</div>


            {/* Don't cares */}
            <div>
              <label className={labelCommon}>Don&apos;t cares (optional, comma-separated)</label>
              <input
                type="text"
                value={dontCares}
                onChange={(e) => setDontCares(e.target.value)}
                placeholder="e.g. 1,9"
                className={inputCommon}
                autoComplete="off"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isRunning}
                className={[
                  'rounded-xl bg-neutral-200 px-4 py-2 font-medium text-neutral-950 transition',
                  'hover:bg-neutral-300 active:bg-neutral-400',
                  'disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer',
                ].join(' ')}
              >
                {isRunning ? 'Solving…' : 'Solve'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-200 transition hover:bg-neutral-800 cursor-pointer"
              >
                Clear Output
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-red-300">
              <div className="font-medium">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 space-y-4">
              {/* Expression card */}
              <div className="rounded-xl border border-blue-300 bg-neutral-900/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-neutral-200">Expression</strong>
                  <button suppressHydrationWarning={true}
                    onClick={() => copy(result.expression)}
                    className="text-xs text-neutral-300 underline-offset-2 hover:underline cursor-pointer"
                  >
                    <CopyButton text={result.expression} />
                  </button>
                </div>
                <code className="block whitespace-pre-wrap wrap-break-word font-mono text-sm text-neutral-100">
                  F = {result.expression}
                </code>
              </div>

              {/* Visual K-Map (moved up) */}
              <KMapGrid
                numInputs={numInputs}
                minterms={parseList(minterms)}
                dontCares={parseList(dontCares)}
                implicants={result.selectedImplicants}
              />

              {/* LaTeX card */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-neutral-200">LaTeX</strong>
                  <button
                    onClick={() => copy(result.latex)}
                    className="text-xs text-neutral-300 underline-offset-2 hover:underline cursor-pointer"
                  >
                    <CopyButton text={result.latex} />
                  </button>
                </div>
                <code className="block whitespace-pre-wrap wrap-break-word font-mono text-sm text-neutral-100">
                  {result.latex}
                </code>
              </div>

              {/* Selected Implicants card (textual) */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <strong className="text-neutral-200">Selected Implicants</strong>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-neutral-300">
                  {result.selectedImplicants.map((imp, i) => (
                    <li key={i}>
                      <code className="font-mono text-neutral-100">{imp.bits}</code>{' '}
                      <span className="text-neutral-400">→</span> covers {imp.covered.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}


        </div>
        {/* Footnote */}        
      </div>
      <br /><br /><br />
       <footer className="fixed bottom-0 left-0 w-full py-3 text-center text-sm text-neutral-400 bg-neutral-900 border-t border-neutral-700">
        <div>Karnaugh Map Solver</div>
        <div className="flex justify-center items-center">
          <FaRegCopyright className="mr-1" />
          Alexander Nickita 2025
        </div>
      </footer>
    </div>
    
  );
}

function parseList(s: string): number[] {
  if (!s.trim()) return [];
  return s
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => Number.isFinite(x));
}

// app/page.tsx (add below the main component, before parseList for example)

type KMapGridProps = {
  numInputs: number;
  minterms: number[];
  dontCares: number[];
  implicants: { bits: string; covered: number[] }[];
};

const GROUP_RING_CLASSES = [
  'ring-2 ring-emerald-400/70',
  'ring-2 ring-sky-400/70',
  'ring-2 ring-violet-400/70',
  'ring-2 ring-amber-400/70',
  'ring-2 ring-rose-400/70',
];

function graySequence(bits: number): number[] {
  if (bits <= 0) return [0];
  const len = 1 << bits;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    out.push(i ^ (i >> 1));
  }
  return out;
}

function toBitsString(n: number, width: number): string {
  return n.toString(2).padStart(width, '0');
}

function KMapGrid({ numInputs, minterms, dontCares, implicants }: KMapGridProps) {
  if (numInputs < 2 || numInputs > 6) return null;

  const rowVars = Math.floor(numInputs / 2); // top group of vars
  const colVars = numInputs - rowVars;       // side group of vars

  const rows = 1 << rowVars;
  const cols = 1 << colVars;

  const rowGray = graySequence(rowVars);
  const colGray = graySequence(colVars);

  const allVars = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numInputs);
  const rowLabelsVars = allVars.slice(0, rowVars);
  const colLabelsVars = allVars.slice(rowVars);

  const valueForMinterm = (m: number): '0' | '1' | 'X' => {
    if (minterms.includes(m)) return '1';
    if (dontCares.includes(m)) return 'X';
    return '0';
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-neutral-100">Karnaugh Map</strong>
        <span className="text-xs text-neutral-400">
          {rowLabelsVars.join('') || '—'} vs {colLabelsVars.join('') || '—'}
        </span>
      </div>

      {/* Grid with header row / column */}
      <div
        className="grid gap-px text-xs font-mono"
        style={{
          gridTemplateColumns: `auto repeat(${cols}, minmax(2.3rem, 1fr))`,
        }}
      >
        {/* Empty top-left corner cell */}
        <div />

        {/* Column Gray-code labels */}
        {colGray.map((g, ci) => (
          <div
            key={`col-label-${ci}`}
            className="flex items-center justify-center rounded-md bg-neutral-900/80 px-2 py-1 text-neutral-200"
          >
            {toBitsString(g, colVars)}
          </div>
        ))}

        {/* Each row: row label + cells */}
        {rowGray.map((rg, ri) => (
          <React.Fragment key={`row-${ri}`}>
            {/* Row Gray-code label */}
            <div className="flex items-center justify-center rounded-md bg-neutral-900/80 px-2 py-1 text-neutral-200">
              {toBitsString(rg, rowVars)}
            </div>

            {/* Cells in this row */}
            {colGray.map((cg, ci) => {
              const minterm = (rg << colVars) | cg;
              const cellVal = valueForMinterm(minterm);

              // Which groups cover this minterm?
              const coveringGroups = implicants.filter((imp) =>
                imp.covered.includes(minterm)
              );
              const firstGroupIndex =
                coveringGroups.length > 0
                  ? implicants.indexOf(coveringGroups[0])
                  : -1;
              const groupRingClass =
                firstGroupIndex >= 0
                  ? GROUP_RING_CLASSES[firstGroupIndex % GROUP_RING_CLASSES.length]
                  : '';

              // Tooltip info
              const bitString = toBitsString(minterm, numInputs);
              const groupsLabel =
                coveringGroups.length > 0
                  ? coveringGroups.map((imp) => imp.bits).join(', ')
                  : 'None';

              return (
                <div
                  key={`cell-${ri}-${ci}`}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-md border border-neutral-800 bg-neutral-950/70 text-neutral-100 ${groupRingClass} cursor-default`}
                >
                  {/* minterm index */}
                  <div className="pointer-events-none absolute left-1 top-1 text-[10px] text-neutral-500">
                    {minterm}
                  </div>

                  {/* value (0/1/X) */}
                  <div className="text-base font-semibold">
                    {cellVal}
                  </div>

                  {/* Hover Tooltip */}
                  <div
                    className="
                      pointer-events-none
                      absolute left-1/2 top-full z-20 mt-1
                      w-max max-w-xs -translate-x-1/2
                      rounded-lg border border-neutral-700 bg-neutral-900/95 px-2.5 py-1.5
                      text-[11px] text-neutral-100 shadow-lg
                      opacity-0 transition-opacity duration-150
                      group-hover:opacity-100
                    "
                  >
                    <div className="font-mono text-[11px] text-neutral-300">
                      <span className="font-semibold text-neutral-100">m{minterm}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-neutral-300">
                      <span className="text-neutral-400">
                        Bits ({allVars.slice(0, numInputs).join('')}):
                      </span>{' '}
                      <span>{bitString}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-neutral-300">
                      <span className="text-neutral-400">Value:</span>{' '}
                      <span>{cellVal === 'X' ? 'X (don’t care)' : cellVal}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-neutral-300">
                      <span className="text-neutral-400">Groups:</span>{' '}
                      <span>{groupsLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend for groups */}
      {implicants.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-300">
          {implicants.map((imp, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-950/80 px-2 py-0.5 ${GROUP_RING_CLASSES[i % GROUP_RING_CLASSES.length]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <code className="font-mono text-neutral-100">{imp.bits}</code>
              <span className="text-neutral-500">
                ({imp.covered.join(', ')})
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
