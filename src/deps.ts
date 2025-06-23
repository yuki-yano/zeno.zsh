export { existsSync } from "jsr:@std/fs@0.229.3/exists";
export { parse as yamlParse } from "jsr:@std/yaml@0.224.3";
export { printf, sprintf } from "jsr:@std/fmt@0.225.6/printf";
export { iterateReader } from "jsr:@std/io@0.224.5/iterate-reader";
export * as path from "jsr:@std/path@1.0.2";

import argsParser from "https://deno.land/x/yargs_parser@yargs-parser-v21.1.1-deno/deno.ts";
export { argsParser };
export type {
  Arguments as ArgParserArguments,
  Options as ArgParserOptions,
} from "https://deno.land/x/yargs_parser@yargs-parser-v21.1.1-deno/lib/yargs-parser-types.ts";

import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
export { xdg };
