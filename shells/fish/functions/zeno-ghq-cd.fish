function zeno-ghq-cd --description "Select and change to a ghq repository directory"
    # Get list of ghq repositories
    set -l repos (ghq list -p 2>/dev/null)
    
    if test (count $repos) -eq 0
        return 1
    end
    
    # Replace HOME with ~ for display
    if set -q HOME
        set -l escaped_home (string escape --style=regex $HOME)
        set repos (string replace -r "^$escaped_home" "~" $repos)
    end
    
    # Build fzf options
    set -l options
    if set -q ZENO_ENABLE_FZF_TMUX
        set options $ZENO_FZF_TMUX_OPTIONS
    end
    set options $options "--prompt='Project >' --preview 'cat \$(eval echo {})/README.md'"
    set options $options "--bind ctrl-d:preview-page-down,ctrl-u:preview-page-up"
    set options $options "--no-multi"
    
    # Select directory with fzf
    set -l selected_dir (printf '%s\n' $repos | eval "$ZENO_FZF_COMMAND $options")
    
    if test -z "$selected_dir"
        return 1
    end
    
    # Escape spaces in the path
    set -l escaped_dir (string escape $selected_dir)
    
    # Set the command and execute
    commandline -r "cd $escaped_dir"
    commandline -f execute
    
    # Rename tmux session if in tmux
    if set -q TMUX; and not set -q ZENO_DISABLE_GHQ_CD_TMUX_RENAME
        # Get the last component of the path (repository name)
        set -l repository (basename $selected_dir)
        # Replace dots with hyphens for tmux session name
        set -l session (string replace -a '.' '-' $repository)
        tmux rename-session "$session" 2>/dev/null
    end
end
