/**
 * @deprecated This file is deprecated. Use src/config/index.ts instead
 * This file is kept for backward compatibility
 */

// Re-export environment variables
export {
  ZENO_DEFAULT_FZF_OPTIONS,
  ZENO_DISABLE_BUILTIN_COMPLETION,
  ZENO_GIT_CAT,
  ZENO_GIT_TREE,
  ZENO_SOCK,
} from "./config/env.ts";

// Re-export config functions
export {
  clearCache,
  findConfigFilePath as findConfigFile,
  getDefaultSettings,
  getSettings,
  loadConfigFile,
  setSettings,
} from "./config/index.ts";
