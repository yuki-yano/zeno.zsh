/**
 * @module cli
 * Main CLI entry point for zeno
 *
 * This file is the entry point when running zeno from the command line.
 * It parses command line arguments and executes the appropriate command.
 */

import { execCli } from "./app.ts";

execCli({ args: Deno.args });
