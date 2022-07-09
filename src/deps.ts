export { existsSync } from "https://deno.land/std@0.113.0/fs/exists.ts";
export { parse as yamlParse } from "https://deno.land/std@0.113.0/encoding/yaml.ts";
export { printf, sprintf } from "https://deno.land/std@0.113.0/fmt/printf.ts";
export { iterateReader } from "https://deno.land/std@0.113.0/streams/conversion.ts";
export * as path from "https://deno.land/std@0.113.0/path/mod.ts";

// TODO: Use Deno.run https://deno.land/manual@v1.13.2/examples/subprocess
export { exec, OutputMode } from "https://deno.land/x/exec@0.0.5/mod.ts";

import argsParser from "https://deno.land/x/yargs_parser@yargs-parser-v21.0.1-deno/deno.ts";
export { argsParser };
export type {
  Arguments as ArgParserArguments,
  Options as ArgParserOptions,
} from "https://deno.land/x/yargs_parser@yargs-parser-v21.0.1-deno/lib/yargs-parser-types.ts";

import xdg from "https://deno.land/x/xdg@v9.0.0/src/mod.deno.ts";
export { xdg };
