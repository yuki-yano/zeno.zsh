const HOME_DIRECTORY = (() => {
  try {
    return typeof Deno !== "undefined" ? Deno.env.get("HOME") ?? null : null;
  } catch {
    return null;
  }
})();

export const getHomeDirectory = (): string | null => {
  try {
    return typeof Deno !== "undefined"
      ? Deno.env.get("HOME") ?? HOME_DIRECTORY
      : HOME_DIRECTORY;
  } catch {
    return HOME_DIRECTORY;
  }
};

export const normalizePathForStorage = (
  value: string | null | undefined,
): string | null => {
  if (!value || value.length === 0) {
    return null;
  }

  if (value === "~" || value.startsWith("~/")) {
    return value;
  }

  const homeDir = getHomeDirectory();
  if (!homeDir || homeDir.length === 0) {
    return value;
  }

  if (value === homeDir) {
    return "~";
  }

  if (value.startsWith(`${homeDir}/`)) {
    return `~/${value.slice(homeDir.length + 1)}`;
  }

  return value;
};

export const expandStoredPath = (
  value: string | null | undefined,
): string | null => {
  if (!value || value.length === 0) {
    return null;
  }

  if (value === "~") {
    return getHomeDirectory();
  }

  if (value.startsWith("~/")) {
    const homeDir = getHomeDirectory();
    if (!homeDir || homeDir.length === 0) {
      return value;
    }
    return `${homeDir}/${value.slice(2)}`;
  }

  return value;
};
