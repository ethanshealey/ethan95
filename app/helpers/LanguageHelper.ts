/** Maps a file extension to a Judge0 language ID. */
export interface Judge0Language {
  languageId: number;
  name: string;
}

/**
 * Maps common file extensions to their Judge0 CE language IDs.
 * Source: https://github.com/judge0/judge0/blob/master/docs/api/languages.md
 */
const EXTENSION_MAP: Record<string, Judge0Language> = {
  // Systems / C family
  c:      { languageId: 50, name: 'C (GCC 9.2.0)' },
  h:      { languageId: 50, name: 'C (GCC 9.2.0)' },
  cpp:    { languageId: 54, name: 'C++ (GCC 9.2.0)' },
  cc:     { languageId: 54, name: 'C++ (GCC 9.2.0)' },
  cxx:    { languageId: 54, name: 'C++ (GCC 9.2.0)' },
  hpp:    { languageId: 54, name: 'C++ (GCC 9.2.0)' },
  hxx:    { languageId: 54, name: 'C++ (GCC 9.2.0)' },
  cs:     { languageId: 51, name: 'C# (Mono 6.6.0)' },
  rs:     { languageId: 73, name: 'Rust (1.40.0)' },
  d:      { languageId: 56, name: 'D (DMD 2.089.1)' },

  // JVM
  java:   { languageId: 62, name: 'Java (OpenJDK 13.0.1)' },
  kt:     { languageId: 78, name: 'Kotlin (1.3.70)' },
  kts:    { languageId: 78, name: 'Kotlin (1.3.70)' },
  scala:  { languageId: 81, name: 'Scala (2.13.2)' },
  groovy: { languageId: 68, name: 'Groovy (3.0.3)' },

  // Python
  py:     { languageId: 71, name: 'Python (3.8.1)' },
  pyw:    { languageId: 71, name: 'Python (3.8.1)' },

  // JavaScript / TypeScript
  js:     { languageId: 63, name: 'JavaScript (Node.js 12.14.0)' },
  mjs:    { languageId: 63, name: 'JavaScript (Node.js 12.14.0)' },
  cjs:    { languageId: 63, name: 'JavaScript (Node.js 12.14.0)' },
  ts:     { languageId: 74, name: 'TypeScript (3.7.4)' },

  // Go
  go:     { languageId: 60, name: 'Go (1.13.5)' },

  // Ruby
  rb:     { languageId: 72, name: 'Ruby (2.7.0)' },

  // PHP
  php:    { languageId: 68, name: 'PHP (7.4.1)' },

  // Swift / Objective-C
  swift:  { languageId: 83, name: 'Swift (5.2.3)' },
  m:      { languageId: 79, name: 'Objective-C (Clang 7.0.1)' },
  mm:     { languageId: 79, name: 'Objective-C (Clang 7.0.1)' },

  // Functional
  hs:     { languageId: 61, name: 'Haskell (GHC 8.8.1)' },
  lhs:    { languageId: 61, name: 'Haskell (GHC 8.8.1)' },
  ml:     { languageId: 65, name: 'OCaml (4.09.0)' },
  mli:    { languageId: 65, name: 'OCaml (4.09.0)' },
  ex:     { languageId: 57, name: 'Elixir (1.9.4)' },
  exs:    { languageId: 57, name: 'Elixir (1.9.4)' },
  erl:    { languageId: 58, name: 'Erlang (OTP 22.2)' },
  lisp:   { languageId: 55, name: 'Common Lisp (SBCL 2.0.0)' },
  cl:     { languageId: 55, name: 'Common Lisp (SBCL 2.0.0)' },

  // Scripting / Shell
  sh:     { languageId: 46, name: 'Bash (5.0.0)' },
  bash:   { languageId: 46, name: 'Bash (5.0.0)' },
  pl:     { languageId: 85, name: 'Perl (5.28.1)' },
  pm:     { languageId: 85, name: 'Perl (5.28.1)' },
  lua:    { languageId: 64, name: 'Lua (5.3.5)' },

  // .NET
  vb:     { languageId: 84, name: 'VB.Net (vbnc 0.0.0.5943)' },

  // Systems / HPC
  r:      { languageId: 80, name: 'R (4.0.0)' },
  R:      { languageId: 80, name: 'R (4.0.0)' },
  f:      { languageId: 59, name: 'Fortran (GFortran 9.2.0)' },
  f90:    { languageId: 59, name: 'Fortran (GFortran 9.2.0)' },
  f95:    { languageId: 59, name: 'Fortran (GFortran 9.2.0)' },
  for:    { languageId: 59, name: 'Fortran (GFortran 9.2.0)' },

  // Assembly
  asm:    { languageId: 45, name: 'Assembly (NASM 2.14.02)' },
  s:      { languageId: 45, name: 'Assembly (NASM 2.14.02)' },
  S:      { languageId: 45, name: 'Assembly (NASM 2.14.02)' },

  // Database
  sql:    { languageId: 82, name: 'SQL (SQLite 3.27.2)' },

  // Prolog / Pascal
  pl6:    { languageId: 69, name: 'Prolog (GNU Prolog 1.4.5)' },
  pro:    { languageId: 69, name: 'Prolog (GNU Prolog 1.4.5)' },
  pas:    { languageId: 67, name: 'Pascal (FPC 3.0.4)' },
  pp:     { languageId: 67, name: 'Pascal (FPC 3.0.4)' },
}

/**
 * Returns the Judge0 language entry for the given file extension.
 * The extension may include or omit a leading dot (e.g. `"py"` or `".py"`).
 * Returns `null` if the extension is not recognized.
 */
export function extensionToLanguage(ext: string): Judge0Language | null {
  const normalized = ext.replace(/^\./, '').toLowerCase()
  return EXTENSION_MAP[normalized] ?? null
}

/**
 * Extracts the file extension from a filename or path and returns the
 * corresponding Judge0 language entry, or `null` if unrecognized.
 */
export function filenameToLanguage(filename: string): Judge0Language | null {
  const parts = filename.split('.')
  if (parts.length < 2) return null
  return extensionToLanguage(parts[parts.length - 1])
}

/**
 * Returns a formatted `string[]` listing every supported language and its
 * recognized extensions, suitable for printing in the CLI.
 */
export function listSupportedLanguages(): string[] {
  const grouped = new Map<number, { name: string; exts: string[] }>()
  for (const [ext, { languageId, name }] of Object.entries(EXTENSION_MAP)) {
    const entry = grouped.get(languageId)
    if (entry) {
      if (!entry.exts.includes(ext)) entry.exts.push(ext)
    } else {
      grouped.set(languageId, { name, exts: [ext] })
    }
  }

  const EXT_W = 24
  const LANG_W = 32

  const pad = (s: string, w: number) => s.length >= w ? s : s + ' '.repeat(w - s.length)
  const divider = ' ' + '-'.repeat(EXT_W) + '  ' + '-'.repeat(LANG_W)

  const lines: string[] = [
    '',
    ` ${pad('EXTENSIONS', EXT_W)}  ${pad('LANGUAGE', LANG_W)}`,
    divider,
  ]

  for (const [, { name, exts }] of grouped) {
    const extStr = exts.map(e => `.${e}`).join(' ')
    lines.push(` ${pad(extStr, EXT_W)}  ${pad(name, LANG_W)}`)
  }

  lines.push('')
  return lines
}
