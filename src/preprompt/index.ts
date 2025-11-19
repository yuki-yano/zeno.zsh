import { applyFirstPlaceholder } from "../snippet/placeholder.ts";
import { loadSnippets } from "../snippet/settings.ts";
import { executeCommand } from "../util/exec.ts";

export type PrepromptResult = {
  status: "success";
  buffer: string;
  cursor: number;
} | {
  status: "failure";
  buffer?: undefined;
  cursor?: undefined;
};

/**
 * Prepare preprompt buffer by applying the first placeholder and ensuring a trailing space.
 * Returns failure when the template is empty or whitespace.
 */
export const preparePreprompt = (template: string): PrepromptResult => {
  if (template.trim().length === 0) {
    return { status: "failure" };
  }

  const templateWithSpace = template.endsWith(" ") ? template : `${template} `;
  const {
    text: buffer,
    cursor,
  } = applyFirstPlaceholder(templateWithSpace, templateWithSpace.length);

  return { status: "success", buffer, cursor };
};

/**
 * Resolve snippet by name and prepare preprompt buffer.
 */
export const preparePrepromptFromSnippet = async (
  snippetName: string,
): Promise<PrepromptResult> => {
  const name = snippetName.trim();
  if (name.length === 0) {
    return { status: "failure" };
  }

  const snippets = await loadSnippets();
  for (const { snippet, name: definedName, evaluate } of snippets) {
    if (definedName == null || name !== definedName.trim()) {
      continue;
    }

    const template = evaluate === true
      ? await executeCommand(snippet)
      : snippet;
    return preparePreprompt(template);
  }

  return { status: "failure" };
};
