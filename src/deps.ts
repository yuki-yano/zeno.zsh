export { exists } from "jsr:@std/fs@1.0.18/exists";
export { parse as yamlParse } from "jsr:@std/yaml@1.0.8";
export { printf, sprintf } from "jsr:@std/fmt@1.0.8/printf";
export { iterateReader } from "jsr:@std/io@0.225.2/iterate-reader";
export * as path from "jsr:@std/path@1.1.0";

import argsParser from "yargs_parser";
export { argsParser };
export type {
  Arguments as ArgParserArguments,
  Options as ArgParserOptions,
} from "yargs_parser/types";

import xdg from "xdg";
export { xdg };
