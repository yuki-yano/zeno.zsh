export type ConfigContext = Readonly<{
  /**
   * The root directory of the project (usually where .git is located)
   */
  projectRoot: string;

  /**
   * The current working directory where zeno is being executed
   */
  currentDirectory: string;

  /**
   * Environment variables
   */
  env: Readonly<Record<string, string | undefined>>;

  /**
   * The shell type (zsh or fish)
   */
  shell: "zsh" | "fish";

  /**
   * User home directory
   */
  homeDirectory: string;
}>;
