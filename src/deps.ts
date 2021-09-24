export { existsSync } from "https://deno.land/std@0.94.0/fs/exists.ts";
export { parse as yamlParse } from "https://deno.land/std@0.94.0/encoding/yaml.ts";
export { printf, sprintf } from "https://deno.land/std@0.94.0/fmt/printf.ts";
export { parse as argParse } from "https://deno.land/std@0.94.0/flags/mod.ts";
export { readAllSync } from "https://deno.land/std@0.94.0/io/util.ts";
// TODO: Use Deno.run https://deno.land/manual@v1.13.2/examples/subprocess
export { exec, OutputMode } from "https://deno.land/x/exec@0.0.5/mod.ts";
