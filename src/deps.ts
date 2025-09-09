export { exists } from "jsr:@std/fs@1.0.19/exists";
export { parse as yamlParse } from "jsr:@std/yaml@1.0.9";
export { printf, sprintf } from "jsr:@std/fmt@1.0.8/printf";
export { iterateReader } from "jsr:@std/io@0.225.2/iterate-reader";
export * as path from "jsr:@std/path@1.1.2";

import argsParser from "https://deno.land/x/yargs_parser@yargs-parser-v21.1.1-deno/deno.ts";
export { argsParser };
export type {
  Arguments as ArgParserArguments,
  Options as ArgParserOptions,
} from "https://deno.land/x/yargs_parser@yargs-parser-v21.1.1-deno/lib/yargs-parser-types.ts";

import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
export { xdg };
