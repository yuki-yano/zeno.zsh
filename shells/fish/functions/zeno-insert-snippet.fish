function zeno-insert-snippet --description "Insert a snippet interactively"
    # Get snippet list from zeno
    set -l output (zeno-call-client-and-fallback --zeno-mode=snippet-list)
    
    if test -z "$output"
        return 1
    end
    
    # Split output into lines
    set -l lines (string split '\n' $output)
    
    # First line contains fzf options
    set -l fzf_options $lines[1]
    
    # Remove first line to get actual snippets
    set -e lines[1]
    
    # Add tmux options if enabled
    if set -q ZENO_ENABLE_FZF_TMUX
        set fzf_options "$ZENO_FZF_TMUX_OPTIONS $fzf_options"
    end
    
    # Show snippets with fzf and get selection
    set -l selected (printf '%s\n' $lines | eval "$ZENO_FZF_COMMAND $fzf_options")
    
    if test -z "$selected"
        return 1
    end
    
    # Extract snippet name (before the colon)
    set -l snippet (string split ':' $selected)[1]
    
    # Get current command line
    set -l buffer (commandline -b)
    set -l cursor (commandline -C)
    
    # Split buffer at cursor position
    set -l lbuffer (string sub -s 1 -l $cursor $buffer)
    set -l rbuffer (string sub -s (math $cursor + 1) $buffer)
    
    # Call zeno to insert snippet
    set -l result (zeno-call-client-and-fallback --zeno-mode=insert-snippet \
        --input.lbuffer="$lbuffer" \
        --input.rbuffer="$rbuffer" \
        --input.snippet="$snippet")
    
    if test -z "$result"
        return 1
    end
    
    # Parse result
    set -l result_lines (string split '\n' $result)
    
    if test "$result_lines[1]" = "success" -a -n "$result_lines[2]"
        # Update command line with new buffer
        commandline -r "$result_lines[2]"
        
        # Set cursor position if provided
        if test -n "$result_lines[3]"
            commandline -C "$result_lines[3]"
        end
    end
end