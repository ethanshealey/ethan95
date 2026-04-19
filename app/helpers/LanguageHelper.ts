/** Maps a file extension to a JDoodle compiler language code and version index. */
export interface JDoodleLanguage {
  language: string
  versionIndex: number
}

/**
 * Maps common file extensions to their JDoodle language code and latest version index.
 * Source: https://www.jdoodle.com/docs/compiler-apis/supported-languages-versions/
 */
const EXTENSION_MAP: Record<string, JDoodleLanguage> = {
  // Systems / C family
  c:      { language: 'c',      versionIndex: 7 },
  h:      { language: 'c',      versionIndex: 7 },
  cpp:    { language: 'cpp',    versionIndex: 7 },
  cc:     { language: 'cpp',    versionIndex: 7 },
  cxx:    { language: 'cpp',    versionIndex: 7 },
  hpp:    { language: 'cpp',    versionIndex: 7 },
  hxx:    { language: 'cpp',    versionIndex: 7 },
  cs:     { language: 'csharp', versionIndex: 6 },
  rs:     { language: 'rust',   versionIndex: 6 },
  zig:    { language: 'zig',    versionIndex: 0 },
  d:      { language: 'd',      versionIndex: 4 },
  v:      { language: 'vlang',  versionIndex: 0 },
  odin:   { language: 'odin',   versionIndex: 0 },
  vala:   { language: 'vala',   versionIndex: 0 },

  // JVM
  java:   { language: 'java',   versionIndex: 6 },
  kt:     { language: 'kotlin', versionIndex: 5 },
  kts:    { language: 'kotlin', versionIndex: 5 },
  scala:  { language: 'scala',  versionIndex: 6 },
  groovy: { language: 'groovy', versionIndex: 6 },
  clj:    { language: 'clojure', versionIndex: 5 },

  // Python
  py:     { language: 'python3', versionIndex: 6 },
  pyw:    { language: 'python3', versionIndex: 6 },

  // JavaScript / TypeScript
  js:     { language: 'nodejs',      versionIndex: 7 },
  mjs:    { language: 'nodejs',      versionIndex: 7 },
  cjs:    { language: 'nodejs',      versionIndex: 7 },
  ts:     { language: 'typescript',  versionIndex: 1 },
  coffee: { language: 'coffeescript', versionIndex: 5 },

  // Go
  go:     { language: 'go', versionIndex: 6 },

  // Ruby / Crystal
  rb:     { language: 'ruby',    versionIndex: 6 },
  cr:     { language: 'crystal', versionIndex: 1 },

  // PHP
  php:    { language: 'php', versionIndex: 6 },

  // Swift / Objective-C
  swift:  { language: 'swift', versionIndex: 6 },
  m:      { language: 'objc',  versionIndex: 6 },
  mm:     { language: 'objc',  versionIndex: 6 },

  // Functional
  hs:     { language: 'haskell', versionIndex: 6 },
  lhs:    { language: 'haskell', versionIndex: 6 },
  ml:     { language: 'ocaml',   versionIndex: 4 },
  mli:    { language: 'ocaml',   versionIndex: 4 },
  ex:     { language: 'elixir',  versionIndex: 6 },
  exs:    { language: 'elixir',  versionIndex: 6 },
  erl:    { language: 'erlang',  versionIndex: 3 },
  fs:     { language: 'fsharp',  versionIndex: 3 },
  fsx:    { language: 'fsharp',  versionIndex: 3 },
  jl:     { language: 'julia',   versionIndex: 1 },
  rkt:    { language: 'racket',  versionIndex: 4 },
  scm:    { language: 'scheme',  versionIndex: 5 },
  lisp:   { language: 'clisp',   versionIndex: 11 },
  cl:     { language: 'clisp',   versionIndex: 11 },

  // Scripting / Shell
  sh:     { language: 'bash', versionIndex: 5 },
  bash:   { language: 'bash', versionIndex: 5 },
  pl:     { language: 'perl', versionIndex: 6 },
  pm:     { language: 'perl', versionIndex: 6 },
  lua:    { language: 'lua',  versionIndex: 5 },
  tcl:    { language: 'tcl',  versionIndex: 6 },
  awk:    { language: 'awk',  versionIndex: 1 },

  // .NET
  vb:     { language: 'vbn', versionIndex: 6 },

  // Dart
  dart:   { language: 'dart', versionIndex: 6 },

  // Systems / HPC
  r:      { language: 'r',       versionIndex: 6 },
  R:      { language: 'r',       versionIndex: 6 },
  f:      { language: 'fortran', versionIndex: 6 },
  f90:    { language: 'fortran', versionIndex: 6 },
  f95:    { language: 'fortran', versionIndex: 6 },
  for:    { language: 'fortran', versionIndex: 6 },

  // Assembly
  asm:    { language: 'nasm',   versionIndex: 6 },
  s:      { language: 'gccasm', versionIndex: 5 },
  S:      { language: 'gccasm', versionIndex: 5 },

  // Database
  sql:    { language: 'sql', versionIndex: 5 },

  // Nim / Prolog / Pascal
  nim:    { language: 'nim',    versionIndex: 5 },
  pl6:    { language: 'prolog', versionIndex: 3 },
  pro:    { language: 'prolog', versionIndex: 3 },
  pas:    { language: 'pascal', versionIndex: 3 },
  pp:     { language: 'pascal', versionIndex: 3 },

  // Hardware
  sv:     { language: 'verilog', versionIndex: 5 },
  svh:    { language: 'verilog', versionIndex: 5 },

  // Other notable
  sol:    { language: 'solidity',    versionIndex: 0 },
  nim2:   { language: 'nim',         versionIndex: 5 },
  hx:     { language: 'haxe',        versionIndex: 2 },
  bf:     { language: 'brainfuck',   versionIndex: 0 },
  factor: { language: 'factor',      versionIndex: 4 },
  ada:    { language: 'ada',         versionIndex: 6 },
  adb:    { language: 'ada',         versionIndex: 6 },
  ads:    { language: 'ada',         versionIndex: 6 },
  cob:    { language: 'cobol',       versionIndex: 4 },
  cbl:    { language: 'cobol',       versionIndex: 4 },
  bc:     { language: 'bc',          versionIndex: 1 },
  raku:   { language: 'raku',        versionIndex: 1 },
  p6:     { language: 'raku',        versionIndex: 1 },
}

/**
 * Returns the JDoodle language code and version index for the given file extension.
 * The extension may include or omit a leading dot (e.g. `"py"` or `".py"`).
 * Returns `null` if the extension is not recognized.
 */
export function extensionToLanguage(ext: string): JDoodleLanguage | null {
  const normalized = ext.replace(/^\./, '').toLowerCase()
  return EXTENSION_MAP[normalized] ?? null
}

/**
 * Extracts the file extension from a filename or path and returns the
 * corresponding JDoodle language entry, or `null` if unrecognized.
 */
export function filenameToLanguage(filename: string): JDoodleLanguage | null {
  const parts = filename.split('.')
  if (parts.length < 2) return null
  return extensionToLanguage(parts[parts.length - 1])
}

/**
 * Returns a formatted `string[]` listing every supported language and its
 * recognized extensions, suitable for printing in the CLI.
 */
export function listSupportedLanguages(): string[] {
  // Group extensions by language code, preserving insertion order for primary ext
  const grouped = new Map<string, { versionIndex: number; exts: string[] }>()
  for (const [ext, { language, versionIndex }] of Object.entries(EXTENSION_MAP)) {
    const entry = grouped.get(language)
    if (entry) {
      if (!entry.exts.includes(ext)) entry.exts.push(ext)
    } else {
      grouped.set(language, { versionIndex, exts: [ext] })
    }
  }

  const EXT_W = 24
  const LANG_W = 16

  const pad = (s: string, w: number) => s.length >= w ? s : s + ' '.repeat(w - s.length)
  const divider = ' ' + '-'.repeat(EXT_W) + '  ' + '-'.repeat(LANG_W) + '  '

  const lines: string[] = [
    '',
    ` ${pad('EXTENSIONS', EXT_W)}  ${pad('LANGUAGE', LANG_W)}`,
    divider,
  ]

  for (const [language, { versionIndex, exts }] of grouped) {
    const extStr = exts.map(e => `.${e}`).join(' ')
    lines.push(` ${pad(extStr, EXT_W)}  ${pad(language, LANG_W)}`)
  }

  lines.push('')
  return lines
}
