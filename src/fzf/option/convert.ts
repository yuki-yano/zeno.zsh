import { CONVERT_IMPLEMENTED_OPTION } from "../../const/option.ts";
import type { FzfOptions } from "../../type/fzf.ts";

const joinBind = (
  bind: ReadonlyArray<{
    key: string;
    action: string;
  }>,
) => {
  return bind.map(({ key, action }) => `${key}:${action}`).join(",");
};

const definedOptionsToArray = (options: FzfOptions) => {
  const arrayOptions: Array<string> = [];

  if (options["--bind"] != null && Array.isArray(options["--bind"])) {
    arrayOptions.push(`--bind=${joinBind(options["--bind"])}`);
  }
  if (options["--expect"] != null) {
    arrayOptions.push(`--expect="${options["--expect"].join(",")}"`);
  } else {
    arrayOptions.push(`--expect="alt-enter"`);
  }

  return arrayOptions;
};

const optionsToArray = (options: FzfOptions) => {
  const arrayOptions = definedOptionsToArray(options);

  Object.entries(options)
    .filter(([key]) =>
      !(CONVERT_IMPLEMENTED_OPTION as ReadonlyArray<string>).includes(
        key,
      )
    )
    .forEach(([key, value]) => {
      if (typeof value !== "string") {
        arrayOptions.push(`${key}`);
      } else {
        arrayOptions.push(`${key}=${value}`);
      }
    });

  return arrayOptions;
};

export const fzfOptionsToString = (options: FzfOptions) => {
  return optionsToArray(options).join(" ");
};
