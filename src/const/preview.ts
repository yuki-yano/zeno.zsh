import { getEnv } from "../config/env.ts";

const env = getEnv();

const git_log_pretty_format =
  "format:%C(yellow)%h %C(green)%cd %C(reset)%s%C(red)%d %C(cyan)[%an]";

export const GIT_STATUS_PREVIEW = `
  ! git diff --exit-code --color=always -- {-1}
  || ! git diff --exit-code --cached --color=always -- {-1}
  || ${env.GIT_CAT} {-1} 2>/dev/null
  || ${env.GIT_TREE} {-1} 2>/dev/null
`.trim().replaceAll(/\n\s*/g, "");

export const GIT_LS_FILES_PREVIEW = `${env.GIT_CAT} {}`;

export const GIT_LOG_PREVIEW = "git show --color=always {2}";

export const GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW = `
  if [[ {1} == '[branch]' ]]; then
    git log {2} --decorate --pretty='${git_log_pretty_format}' --date=iso --graph --color=always
  elif [[ {1} == '[tag]' ]]; then
    git log {2} --pretty='${git_log_pretty_format}' --date=iso --graph --color=always
  elif [[ {1} == '[commit]' || {1} == '[reflog]' ]]; then
    git show --color=always {2}
  fi
`.trim().replaceAll(/\n\s*/g, ";");

export const GIT_STASH_PREVIEW = "git show --color=always {1}";
