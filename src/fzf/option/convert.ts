import { CONVERT_IMPLEMENTED_OPTIONS } from "../../const/option.ts";
import type { FzfOptions } from "../../type/fzf.ts";

const joinBind = (
  bind: readonly Readonly<{
    key: string;
    action: string;
  }>[],
) => {
  return bind.map(({ key, action }) => `${key}:${action}`).join(",");
};

const definedOptionsToArray = (options: FzfOptions) => {
  const arrayOptions = [] as string[];

  if (Array.isArray(options["--bind"])) {
    arrayOptions.push(`--bind="${joinBind(options["--bind"])}"`);
  }
  if (Array.isArray(options["--expect"])) {
    arrayOptions.push(`--expect="${options["--expect"].join(",")}"`);
  } else {
    arrayOptions.push(`--expect="alt-enter"`);
  }
  if (options["--preview"] != null) {
    arrayOptions.push(`--preview="${options["--preview"]}"`);
  }

  return arrayOptions;
};

const generalOptionsToArray = (options: FzfOptions) => {
  return Object.entries(options)
    .filter(([key]) =>
      !(CONVERT_IMPLEMENTED_OPTIONS as readonly string[]).includes(key)
    )
    .map(([key, value]) => {
      if (typeof value === "string") {
        return `${key}=${value}`;
      } else if (typeof value === "boolean") {
        if (value) {
          return key;
        }
      } else {
        return key;
      }
    });
};

const optionsToArray = (options: FzfOptions) => {
  return [
    ...definedOptionsToArray(options),
    ...generalOptionsToArray(options),
  ];
};

export const fzfOptionsToString = (options: FzfOptions) => {
  return optionsToArray(options).join(" ");
};
