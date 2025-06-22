function zeno-completion --description "Fuzzy completion with fzf"
    # Get current command line state
    set -l buffer (commandline -b)
    set -l cursor (commandline -C)
    
    # Calculate LBUFFER and RBUFFER equivalents
    set -l lbuffer ""
    set -l rbuffer ""
    
    if test -n "$buffer"
        if test $cursor -gt 0
            set lbuffer (string sub -s 1 -l $cursor -- $buffer)
        end
        if test $cursor -lt (string length -- $buffer)
            set rbuffer (string sub -s (math $cursor + 1) -- $buffer)
        end
    end
    
    # Call zeno with completion mode
    set -l out (zeno-call-client-and-fallback --zeno-mode=completion \
        --input.lbuffer="$lbuffer" \
        --input.rbuffer="$rbuffer" | string split \n)
    
    if test "$out[1]" != "success"
        # Fallback to default Fish completion
        if set -q ZENO_COMPLETION_FALLBACK
            # TODO: Implement custom fallback
            commandline -f complete
        else
            commandline -f complete
        end
        return
    end
    
    # Extract completion parameters
    set -l source_command $out[2]
    set -l options $out[3]
    set -l callback $out[4]
    set -l callback_zero $out[5]
    
    # Add fzf-tmux options if enabled
    if set -q ZENO_ENABLE_FZF_TMUX
        set options "$ZENO_FZF_TMUX_OPTIONS $options"
    end
    
    # Build the command line
    set -l cmdline "$source_command | $ZENO_FZF_COMMAND $options"
    
    # Execute the command and capture output
    # For commands with null-terminated output, we need to handle it specially
    set -l temp_file (mktemp)
    
    # Use bash to evaluate the command to handle bash-specific syntax in fzf options
    bash -c "$cmdline" > $temp_file
    set -l exit_status $status
    
    # Check if user cancelled (ESC or Ctrl-C)
    if test $exit_status -ne 0
        rm -f $temp_file
        commandline -f repaint
        return
    end
    
    # Read the result from the temp file
    # Check if output contains null characters
    if grep -q '\x00' $temp_file 2>/dev/null
        # Read null-terminated output
        set out (cat $temp_file | string split0)
    else
        # Read newline-terminated output
        set out (cat $temp_file | string split \n)
    end
    
    rm -f $temp_file
    
    # Extract expect key (first line) and shift array
    set -l expect_key $out[1]
    set -e out[1]
    
    # Remove empty items
    set -l filtered_out
    for item in $out
        if test -n "$item"
            set -a filtered_out $item
        end
    end
    set out $filtered_out
    
    # Apply callback if specified
    if test -n "$callback" -a -n "$out"
        if test "$callback_zero" = "zero"
            # Use null character as delimiter
            set out (printf '%s\0' $out | eval $callback | string split0)
        else
            # Use newline as delimiter
            set out (printf '%s\n' $out | eval $callback | string split \n)
        end
        
        # Remove empty items again
        set filtered_out
        for item in $out
            if test -n "$item"
                set -a filtered_out $item
            end
        end
        set out $filtered_out
    end
    
    # Update buffer if result is not empty
    if test -n "$out"
        # Quote each item properly and append to command line
        for item in $out
            # Escape special characters
            set -l quoted (string escape -- $item)
            commandline -i " $quoted"
        end
        
        # Try to move to next placeholder
        if functions -q zeno-snippet-next-placeholder
            zeno-snippet-next-placeholder
        end
    end
    
    commandline -f repaint
end
