import { DEFAULT_OPTIONS } from "../../const/option.ts";
import { GIT_ADD_PREVIEW } from "../../const/preview.ts";
import type { CompletionSource } from "../../type/fzf.ts";

export const gitSources: Array<CompletionSource> = [
  {
    id: "git add",
    pattern: /^git add( -p| --patch)? $/,
    sourceCommand: "git -c color.status=always status --short",
    preview: GIT_ADD_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Add Files> '",
    },
    callback: (lines) => (
      lines.map((line) => (line.split(" ").slice(-1)[0]))
    ),
  },
];
