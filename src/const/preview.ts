import { ZENO_GIT_CAT, ZENO_GIT_TREE } from "../settings.ts";

export const GIT_STATUS_PREVIEW =
  `[[ \\$(git diff -- {-1}) ]] && git diff --color=always -- {-1} || [[ \\$(git diff --cached -- {-1} ) ]] && git diff --cached --color=always -- {-1} || ${ZENO_GIT_CAT} {-1} 2>/dev/null || ${ZENO_GIT_TREE} {-1} 2>/dev/null`;

export const GIT_LS_FILES_PREVIEW = `${ZENO_GIT_CAT} {}`;

export const GIT_LOG_PREVIEW = "git show --color=always {2}";

export const GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW =
  "[[ '{1}' == '[branch]' ]] && git log {2} --decorate --pretty='format:%C(yellow)%h %C(green)%cd %C(reset)%s %C(red)%d %C(cyan)[%an]' --date=iso --graph --color=always || [[ '{1}' == '[tag]' ]] && git log {2} --pretty='format:%C(yellow)%h %C(green)%cd %C(reset)%s %C(red)%d %C(cyan)[%an]' --date=iso --graph --color=always  || [[ '{1}' == '[commit]' ]] && git show --color=always {2} || [[ '{1}' == '[reflog]' ]] && git show --color=always {2}";

export const GIT_STASH_PREVIEW = "git show --color=always {1}";
