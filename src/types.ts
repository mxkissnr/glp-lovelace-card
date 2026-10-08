// Shared, type-only shapes the GLP-SHARED blocks need (#180). This module is
// imported with `import type` and emits nothing at runtime.

// An [r, g, b] triple (0-255) resolved from a CSS colour string.
export type Rgb = [number, number, number];

// A resolved two-stop accent colour pair, as returned by _appMachineTheme().
export interface ThemeStops {
  a: string;
  b: string;
}

export interface MachineTheme {
  preset?: string;
  a: string;
  b: string;
}

// One entry in a *_machine_status entity's `machines[]` attribute, as
// forwarded verbatim from the app's GET /api/status (gaggiuino-local-profiler#701).
export interface MachineEntry {
  id?: string;
  name?: string;
  isDefault?: boolean;
  type?: string;
  theme?: MachineTheme;
}
