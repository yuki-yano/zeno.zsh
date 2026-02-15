/**
 * Example TypeScript configuration file for zeno.zsh
 *
 * This demonstrates CLI-focused configurations with dynamic context awareness.
 * The configuration adapts based on the current project type and directory.
 */

import { defineConfig, directoryExists, fileExists } from "../src/mod.ts";
import type { Snippet, UserCompletionSource } from "../src/mod.ts";
import { path } from "../src/deps.ts";

const { join } = path;

export default defineConfig(
  async ({ projectRoot, currentDirectory, env: _env, shell }) => {
    // Detect project types using filesystem clues
    const [
      gitDirExists,
      packageJsonExists,
      nodeModulesExists,
      dockerfileExists,
      dockerComposeYamlExists,
      dockerComposeYmlExists,
      kubeDirAtRootExists,
      kubeDirInCurrentExists,
      kubernetesDirAtRootExists,
      kubernetesDirInCurrentExists,
    ] = await Promise.all([
      directoryExists(join(projectRoot, ".git")),
      fileExists(join(projectRoot, "package.json")),
      directoryExists(join(projectRoot, "node_modules")),
      fileExists(join(projectRoot, "Dockerfile")),
      fileExists(join(projectRoot, "docker-compose.yaml")),
      fileExists(join(projectRoot, "docker-compose.yml")),
      directoryExists(join(projectRoot, "k8s")),
      directoryExists(join(currentDirectory, "k8s")),
      directoryExists(join(projectRoot, "kubernetes")),
      directoryExists(join(currentDirectory, "kubernetes")),
    ]);

    const isGitRepo = gitDirExists;
    const isNodeProject = packageJsonExists || nodeModulesExists;
    const isDockerProject = dockerfileExists || dockerComposeYamlExists ||
      dockerComposeYmlExists;
    const isKubernetesProject = kubeDirAtRootExists ||
      kubeDirInCurrentExists ||
      kubernetesDirAtRootExists ||
      kubernetesDirInCurrentExists;

    // Base snippets available everywhere
    const baseSnippets: Snippet[] = [
      {
        name: "null redirect",
        keyword: "null",
        snippet: ">/dev/null 2>&1",
        context: {
          lbuffer: ".+\\s",
        },
      },
      {
        name: "pipe grep",
        keyword: "G",
        snippet: "| grep ",
        context: {
          lbuffer: ".+\\s",
        },
      },
      {
        name: "pipe less",
        keyword: "L",
        snippet: "| less",
        context: {
          lbuffer: ".+\\s",
        },
      },
      {
        name: "pipe awk print",
        keyword: "awk",
        snippet: "| awk '{print ${{1:1}}}'",
        context: {
          lbuffer: ".+\\s",
        },
      },
      {
        name: "pipe jq",
        keyword: "jq",
        snippet: "| jq '{{.}}'",
        context: {
          lbuffer: ".+\\s",
        },
      },
      {
        name: "pipe wc lines",
        keyword: "wcl",
        snippet: "| wc -l",
        context: {
          lbuffer: ".+\\s",
        },
      },
    ];

    // Git-specific snippets
    const gitSnippets: Snippet[] = [
      {
        name: "git status",
        keyword: "gs",
        snippet: "git status --short --branch",
      },
      {
        name: "git add",
        keyword: "ga",
        snippet: "git add .",
      },
      {
        name: "git commit",
        keyword: "gcim",
        snippet: "git commit -m '{{message}}'",
      },
      {
        name: "git push",
        keyword: "gp",
        snippet: "git push",
      },
      {
        name: "git pull",
        keyword: "gl",
        snippet: "git pull",
      },
      {
        name: "git diff",
        keyword: "gd",
        snippet: "git diff",
      },
      {
        name: "git log oneline",
        keyword: "glo",
        snippet: "git log --oneline -n 20",
      },
    ];

    // Node.js/npm specific snippets
    const nodeSnippets: Snippet[] = [
      {
        name: "npm install",
        keyword: "ni",
        snippet: "npm install",
      },
      {
        name: "npm install save-dev",
        keyword: "nid",
        snippet: "npm install --save-dev {{package}}",
      },
      {
        name: "npm run dev",
        keyword: "nrd",
        snippet: "npm run dev",
      },
      {
        name: "npm run test",
        keyword: "nrt",
        snippet: "npm run test",
      },
      {
        name: "npm run build",
        keyword: "nrb",
        snippet: "npm run build",
      },
      {
        name: "npm run lint",
        keyword: "nrl",
        snippet: "npm run lint",
      },
      {
        name: "npm run format",
        keyword: "nrf",
        snippet: "npm run format",
      },
      {
        name: "npm outdated",
        keyword: "no",
        snippet: "npm outdated",
      },
      {
        name: "npm update",
        keyword: "nu",
        snippet: "npm update",
      },
    ];

    // Docker specific snippets
    const dockerSnippets: Snippet[] = [
      {
        name: "docker ps all",
        keyword: "dps",
        snippet: "docker ps -a",
      },
      {
        name: "docker images",
        keyword: "di",
        snippet: "docker images",
      },
      {
        name: "docker exec interactive",
        keyword: "dex",
        snippet: "docker exec -it {{container}} /bin/bash",
      },
      {
        name: "docker logs follow",
        keyword: "dlf",
        snippet: "docker logs -f {{container}}",
      },
      {
        name: "docker compose up",
        keyword: "dcu",
        snippet: "docker compose up -d",
      },
      {
        name: "docker compose down",
        keyword: "dcd",
        snippet: "docker compose down",
      },
      {
        name: "docker compose logs",
        keyword: "dcl",
        snippet: "docker compose logs -f {{service}}",
      },
      {
        name: "docker build",
        keyword: "db",
        snippet: "docker build -t {{tag}} .",
      },
      {
        name: "docker run interactive",
        keyword: "dri",
        snippet: "docker run -it --rm {{image}}",
      },
      {
        name: "docker stop all",
        keyword: "dsa",
        snippet: "docker stop $(docker ps -q)",
      },
    ];

    // Kubernetes specific snippets
    const kubernetesSnippets: Snippet[] = [
      {
        name: "kubectl get pods",
        keyword: "kgp",
        snippet: "kubectl get pods",
      },
      {
        name: "kubectl get services",
        keyword: "kgs",
        snippet: "kubectl get services",
      },
      {
        name: "kubectl describe pod",
        keyword: "kdp",
        snippet: "kubectl describe pod {{pod}}",
      },
      {
        name: "kubectl logs",
        keyword: "kl",
        snippet: "kubectl logs -f {{pod}}",
      },
      {
        name: "kubectl apply",
        keyword: "ka",
        snippet: "kubectl apply -f {{file}}",
      },
      {
        name: "kubectl delete",
        keyword: "kd",
        snippet: "kubectl delete -f {{file}}",
      },
      {
        name: "kubectl exec",
        keyword: "kex",
        snippet: "kubectl exec -it {{pod}} -- /bin/bash",
      },
      {
        name: "kubectl get all",
        keyword: "kga",
        snippet: "kubectl get all -n {{namespace}}",
      },
    ];

    // Shell-specific snippets
    const shellSnippets: Snippet[] = shell === "zsh"
      ? [
        {
          name: "reload zshrc",
          keyword: "reload",
          snippet: "source ~/.zshrc",
        },
      ]
      : [
        {
          name: "reload fish config",
          keyword: "reload",
          snippet: "source ~/.config/fish/config.fish",
        },
      ];

    // Combine snippets based on context
    const snippets = [
      ...baseSnippets,
      ...shellSnippets,
      ...(isGitRepo ? gitSnippets : []),
      ...(isNodeProject ? nodeSnippets : []),
      ...(isDockerProject ? dockerSnippets : []),
      ...(isKubernetesProject ? kubernetesSnippets : []),
    ];

    // Build completions array
    const completions: UserCompletionSource[] = [];

    // Docker completions
    if (isDockerProject) {
      completions.push(
        {
          name: "docker images",
          patterns: ["^docker (run|pull|push|tag|rmi)\\s"],
          sourceCommand: "docker images --format '{{.Repository}}:{{.Tag}}'",
          options: {
            "--prompt": "'Docker Images> '",
            "--preview":
              "'docker images --filter reference={} --format \"table {{.Repository}}:{{.Tag}}\\t{{.Size}}\\t{{.CreatedSince}}\"'",
          },
          callback: "awk '{print $1}'",
        },
        {
          name: "docker containers",
          patterns: ["^docker (exec|logs|stop|start|rm|inspect)\\s"],
          sourceCommand:
            "docker ps -a --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'",
          options: {
            "--prompt": "'Docker Containers> '",
            "--header-lines": "1",
          },
          callback: "awk 'NR>1 {print $1}'",
        },
        {
          name: "docker compose services",
          patterns: ["^docker compose (logs|exec|stop|start|restart)\\s"],
          sourceCommand: "docker compose ps --services 2>/dev/null",
          options: {
            "--prompt": "'Docker Compose Services> '",
          },
          callback: "awk '{print $1}'",
        },
      );
    }

    // NPM script completions for Node.js projects
    if (isNodeProject) {
      completions.push(
        {
          name: "npm scripts",
          patterns: ["^npm run\\s"],
          sourceFunction: async ({ projectRoot }) => {
            if (!packageJsonExists) {
              return [];
            }
            try {
              const pkgPath = join(projectRoot, "package.json");
              const pkg = JSON.parse(
                await Deno.readTextFile(pkgPath),
              ) as { scripts?: Record<string, unknown> };
              return Object.keys(pkg.scripts ?? {});
            } catch {
              return [];
            }
          },
          options: {
            "--prompt": "'NPM Scripts> '",
          },
          callbackFunction: ({ selected, expectKey }) => {
            if (expectKey === "alt-enter") {
              return selected;
            }
            return selected.map((script) => `npm run ${script}`);
          },
          callbackPreviewFunction: async ({ item, context }) => {
            try {
              const pkgPath = join(context.projectRoot, "package.json");
              const pkg = JSON.parse(
                await Deno.readTextFile(pkgPath),
              ) as { scripts?: Record<string, string> };
              const script = pkg.scripts?.[item];
              return script ? `${item}\n${script}` : item;
            } catch {
              return item;
            }
          },
        },
        {
          name: "npm packages",
          patterns: ["^npm (uninstall|update)\\s"],
          sourceCommand:
            "cat package.json 2>/dev/null | jq -r '.dependencies,.devDependencies | keys[]' 2>/dev/null | sort -u",
          options: {
            "--prompt": "'Installed Packages> '",
          },
          callback: "awk '{print $1}'",
        },
      );
    }

    // Kubernetes completions
    if (isKubernetesProject) {
      completions.push(
        {
          name: "kubectl pods",
          patterns: [
            "^kubectl (logs|exec|describe|delete pod|port-forward)\\s",
          ],
          sourceCommand:
            "kubectl get pods --no-headers 2>/dev/null | awk '{print $1}'",
          options: {
            "--prompt": "'Kubernetes Pods> '",
            "--preview": "'kubectl get pod {} -o wide 2>/dev/null'",
          },
          callback: "awk '{print $1}'",
        },
        {
          name: "kubectl namespaces",
          patterns: ["^kubectl (-n|--namespace)\\s"],
          sourceCommand:
            "kubectl get namespaces --no-headers 2>/dev/null | awk '{print $1}'",
          options: {
            "--prompt": "'Kubernetes Namespaces> '",
          },
          callback: "awk '{print $1}'",
        },
      );
    }

    // Git completions (always useful in git repos)
    if (isGitRepo) {
      completions.push(
        {
          name: "git branches",
          patterns: ["^git (checkout|merge|rebase|branch -[dD])\\s"],
          sourceCommand:
            "git branch -a --format='%(refname:short)' 2>/dev/null | sed 's|^origin/||' | sort -u",
          options: {
            "--prompt": "'Git Branches> '",
            "--preview":
              "'git log --oneline --graph --decorate {} -10 2>/dev/null'",
          },
          callback: "awk '{print $1}'",
        },
        {
          name: "git files",
          patterns: ["^git (add|diff|checkout --)\\s"],
          sourceCommand: "git status --short 2>/dev/null | awk '{print $2}'",
          options: {
            "--prompt": "'Git Files> '",
            "--preview": "'git diff --color=always {} 2>/dev/null | head -100'",
            "--multi": true as const,
          },
          callback: "awk '{print $1}'",
        },
      );
    }

    return {
      snippets,
      completions,
    };
  },
);

/**
 * Alternative: Async configuration with external data loading
 *
 * export default defineConfig(async (context) => {
 *   // Example: Load team-specific snippets from a shared location
 *   const teamConfigUrl = context.env.TEAM_CONFIG_URL;
 *
 *   if (teamConfigUrl) {
 *     try {
 *       const response = await fetch(teamConfigUrl);
 *       const teamConfig = await response.json();
 *
 *       return {
 *         snippets: teamConfig.snippets || [],
 *         completions: teamConfig.completions || []
 *       };
 *     } catch (error) {
 *       console.error('Failed to load team config:', error);
 *     }
 *   }
 *
 *   // Example: Parse .tool-versions for asdf completions
 *   const toolVersionsPath = `${context.projectRoot}/.tool-versions`;
 *   const customCompletions = [];
 *
 *   try {
 *     const toolVersions = await Deno.readTextFile(toolVersionsPath);
 *     const tools = toolVersions.split('\n')
 *       .filter(line => line.trim())
 *       .map(line => line.split(' ')[0]);
 *
 *     if (tools.length > 0) {
 *       customCompletions.push({
 *         name: "asdf tools",
 *         patterns: ["^asdf (current|list|plugin-remove)\\s"],
 *         sourceCommand: `echo "${tools.join('\n')}"`,
 *         options: {
 *           "--prompt": "'ASDF Tools> '"
 *         }
 *       });
 *     }
 *   } catch {
 *     // .tool-versions not found
 *   }
 *
 *   return {
 *     snippets: [],
 *     completions: customCompletions
 *   };
 * });
 */
