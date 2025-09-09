/**
 * Example TypeScript configuration file for zeno.zsh
 * 
 * This demonstrates how to use the defineConfig function
 * to create dynamic configurations based on project context.
 */

import { defineConfig } from "../src/mod.ts";
import type { Snippet } from "../src/mod.ts";

export default defineConfig(({ projectRoot, currentDirectory, env, shell }) => {
  // Check if we're in a git repository
  const isGitRepo = projectRoot.includes('.git');
  
  // Check if we're in a Node.js project
  const isNodeProject = currentDirectory.includes('node_modules') || 
                       projectRoot.includes('package.json');
  
  // Base snippets available everywhere
  const baseSnippets: Snippet[] = [
    {
      name: "null redirect",
      keyword: "null",
      snippet: ">/dev/null 2>&1",
      context: {
        lbuffer: '.+\\s'
      }
    },
    {
      name: "pipe grep",
      keyword: "G",
      snippet: "| grep ",
      context: {
        lbuffer: '.+\\s'
      }
    }
  ];
  
  // Git-specific snippets
  const gitSnippets: Snippet[] = [
    {
      name: "git status",
      keyword: "gs",
      snippet: "git status --short --branch"
    },
    {
      name: "git add",
      keyword: "ga",
      snippet: "git add ."
    },
    {
      name: "git commit",
      keyword: "gcim",
      snippet: "git commit -m '{{message}}'"
    },
    {
      name: "git push",
      keyword: "gp",
      snippet: "git push"
    },
    {
      name: "git pull",
      keyword: "gl",
      snippet: "git pull"
    },
    {
      name: "git diff",
      keyword: "gd",
      snippet: "git diff"
    },
    {
      name: "git log oneline",
      keyword: "glo",
      snippet: "git log --oneline -n 20"
    }
  ];
  
  // Node.js/npm specific snippets
  const nodeSnippets: Snippet[] = [
    {
      name: "npm install",
      keyword: "ni",
      snippet: "npm install"
    },
    {
      name: "npm run dev",
      keyword: "nrd",
      snippet: "npm run dev"
    },
    {
      name: "npm run test",
      keyword: "nrt",
      snippet: "npm run test"
    },
    {
      name: "npm run build",
      keyword: "nrb",
      snippet: "npm run build"
    }
  ];
  
  // Shell-specific snippets
  const shellSnippets: Snippet[] = shell === "zsh" ? [
    {
      name: "reload zshrc",
      keyword: "reload",
      snippet: "source ~/.zshrc"
    }
  ] : [
    {
      name: "reload fish config",
      keyword: "reload",
      snippet: "source ~/.config/fish/config.fish"
    }
  ];
  
  // Combine snippets based on context
  const snippets = [
    ...baseSnippets,
    ...shellSnippets,
    ...(isGitRepo ? gitSnippets : []),
    ...(isNodeProject ? nodeSnippets : [])
  ];
  
  return {
    snippets,
    completions: [
      // Example completion for docker commands
      {
        name: "docker images",
        patterns: ["^docker images\\s"],
        sourceCommand: "docker images --format '{{.Repository}}:{{.Tag}}'",
        options: {
          "--prompt": "'Docker Images> '"
        },
        callback: "awk '{print $1}'"
      }
    ]
  };
});

/**
 * Alternative: Async configuration example
 * 
 * export default defineConfig(async (context) => {
 *   // Load project-specific configuration
 *   const projectConfigPath = `${context.projectRoot}/.zeno.json`;
 *   
 *   try {
 *     const projectConfig = await Deno.readTextFile(projectConfigPath);
 *     const config = JSON.parse(projectConfig);
 *     
 *     return {
 *       snippets: config.snippets || [],
 *       completions: config.completions || []
 *     };
 *   } catch {
 *     // Fallback to default configuration
 *     return {
 *       snippets: [],
 *       completions: []
 *     };
 *   }
 * });
 */