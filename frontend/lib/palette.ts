/**
 * The dashboard tell-tale colours, for code that can't read CSS (three.js materials, canvas).
 * Keep in step with the @theme block in app/globals.css.
 */
export const TELLTALE = {
  /** high-beam blue: selected, switched on */
  beam: "#6b97ff",
  /** green: fine, do it yourself */
  go: "#3dd68c",
  /** amber: take care */
  caution: "#ffb224",
  /** red: stop, mechanic */
  stop: "#ff5a4e",
} as const;

export const STATUS_COLOR = {
  diy: TELLTALE.go,
  advanced: TELLTALE.caution,
  shop: TELLTALE.stop,
} as const;
