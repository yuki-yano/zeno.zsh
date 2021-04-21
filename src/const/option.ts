export const CONVERT_IMPLEMENTED_OPTION = ["--bind", "--expect"];

export const DEFAULT_BIND = [
  {
    key: "ctrl-d",
    action: "preview-half-page-down",
  },
  {
    key: "ctrl-u",
    action: "preview-half-page-up",
  },
  {
    key: "?",
    action: "toggle-preview",
  },
] as const;

export const DEFAULT_OPTIONS = {
  "--ansi": true,
  "--bind": DEFAULT_BIND,
  "--expect": ["alt-enter"],
  "--height": "'80%'",
} as const;
