import type { CompletionSource } from "../../type/fzf.ts";

/**
 * Create a cache manager for completion sources using closure
 */
export const createCompletionSourceCache = () => {
  let cache: readonly CompletionSource[] | undefined;

  return {
    get: (): readonly CompletionSource[] | undefined => {
      return cache;
    },

    set: (sources: readonly CompletionSource[]): void => {
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
