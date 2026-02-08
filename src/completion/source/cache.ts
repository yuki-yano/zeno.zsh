import type { ResolvedCompletionSource } from "../../type/fzf.ts";

/**
 * Create a cache manager for completion sources using closure
 */
export const createCompletionSourceCache = () => {
  let cache: readonly ResolvedCompletionSource[] | undefined;

  return {
    get: (): readonly ResolvedCompletionSource[] | undefined => {
      return cache;
    },

    set: (sources: readonly ResolvedCompletionSource[]): void => {
      cache = sources;
    },

    clear: (): void => {
      cache = undefined;
    },
  };
};

// Global instance
const globalCache = createCompletionSourceCache();

export const getCompletionSourceCache = () => globalCache;
