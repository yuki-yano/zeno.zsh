/**
 * Split a command string into executable parts, handling quoted arguments.
 * This implementation is based on the original exec module's splitCommand function.
 *
 * @param command The command string to parse
 * @returns Array of command parts with quotes removed
 *
 * @example
 * splitCommand('perl -e "$x=\'HOHO\'; print $x;"')
 * // Returns: ['perl', '-e', '$x=\'HOHO\'; print $x;']
 */
export function splitCommand(command: string): string[] {
  const myRegexp = /[^\s"]+|"([^"]*)"/gi;
  const splits: string[] = [];

  let match;
  while ((match = myRegexp.exec(command)) !== null) {
    // Use captured group if it exists (quoted string), otherwise use full match
    splits.push(match[1] ? match[1] : match[0]);
  }

  return splits;
}

/**
 * Execute a command and return its output.
 * This function replaces the deprecated exec module functionality.
 *
 * @param command The command string to execute
 * @returns The trimmed output of the command, or empty string on failure
 */
export async function executeCommand(command: string): Promise<string> {
  const splits = splitCommand(command);
  const cmd = splits[0];
  const args = splits.slice(1);

  const proc = new Deno.Command(cmd, {
    args: args,
    stdout: "piped",
    stderr: "piped",
  });

  try {
    const output = await proc.output();
    if (output.success) {
      return new TextDecoder().decode(output.stdout).trimEnd();
    } else {
      // Return empty string on failure (matching original exec module behavior)
      return "";
    }
  } catch (_error) {
    // Return empty string on error (matching original exec module behavior)
    return "";
  }
}
