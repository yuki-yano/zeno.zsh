function zeno-history-selection --description "Select a command from history"
    # Build fzf options
    set -l options
    if set -q ZENO_ENABLE_FZF_TMUX
        set options $ZENO_FZF_TMUX_OPTIONS
    end
    
    # Get current buffer for query
    set -l current_buffer (commandline -b)
    
    # Add fzf options
    set options $options "--no-sort --exact --no-multi --query='$current_buffer' --prompt='History> '"
    
    # Check if bat is available for preview
    if command -q bat
        set options $options "--preview 'echo {} | bat --color=always --language=sh --style=plain' --preview-window=down"
    end
    
    # Get history and show in fzf
    # Fish history is newest first, so we don't need to reverse it
    set -l selected (history | eval "$ZENO_FZF_COMMAND $options")
    
    if test -n "$selected"
        # Replace command line with selected history
        commandline -r "$selected"
        # Move cursor to end of line
        commandline -f end-of-line
    end
end
