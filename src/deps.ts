// deno-lint-ignore no-import-prefix
import * as path from "jsr:@std/path@1.1.0";

export { exists } from "jsr:@std/fs@1.0.18/exists";
export { parse as yamlParse } from "jsr:@std/yaml@1.0.8";
export { printf, sprintf } from "jsr:@std/fmt@1.0.8/printf";
export { iterateReader } from "jsr:@std/io@0.225.2/iterate-reader";
export { path };

// deno-lint-ignore no-import-prefix
import argsParser from "npm:yargs-parser@21.1.1";
export { argsParser };
export type {
  Arguments as ArgParserArguments,
  Options as ArgParserOptions,
} from "npm:yargs-parser@21.1.1";

// deno-lint-ignore no-import-prefix
import xdg from "jsr:@404wolf/xdg-portable@0.1.0";
export { xdg };
