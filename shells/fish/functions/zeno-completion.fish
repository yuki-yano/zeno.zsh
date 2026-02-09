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
    # Note: Fish command substitution automatically splits by newlines
    set -l out (zeno-call-client-and-fallback --zeno-mode=completion \
        --input.lbuffer="$lbuffer" \
        --input.rbuffer="$rbuffer")
    
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
    set -l callback_kind $out[6]
    set -l source_id $out[7]
    set -l expect_keys

    if test -z "$callback_kind"
        if test -n "$callback"
            set callback_kind shell
        else
            set callback_kind none
        end
    end
    
    # Add fzf-tmux options if enabled
    if set -q ZENO_ENABLE_FZF_TMUX
        set options "$ZENO_FZF_TMUX_OPTIONS $options"
    end

    set -l expect_arg (string match -r -- '--expect="[^"]*"|--expect=[^ ]+' -- $options)
    if test -n "$expect_arg"
        set -l expect_value (string replace -r '^--expect=' '' -- $expect_arg)
        set expect_value (string trim --chars '"' -- $expect_value)
        set expect_keys (string split ',' -- $expect_value)
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
    
    # Extract expect key only when the first token is a configured expect key.
    # Some fzf versions do not emit an empty placeholder for Enter.
    set -l expect_key ""
    if test -n "$out"
        if test (count $expect_keys) -gt 0
            if contains -- "$out[1]" $expect_keys
                set expect_key $out[1]
                set -e out[1]
            end
        else if test "$out[1]" = ""
            set -e out[1]
        end
    end
    
    # Remove empty items
    set -l filtered_out
    for item in $out
        if test -n "$item"
            set -a filtered_out $item
        end
    end
    set out $filtered_out
    
    # Apply shell callback if specified
    if test "$callback_kind" = "shell" -a -n "$callback" -a -n "$out"
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
    else if test "$callback_kind" = "function" -a -n "$source_id" -a -n "$out"
        set -l selected_file (mktemp)
        if test -n "$selected_file"
            chmod 600 $selected_file 2>/dev/null
            set -l cleanup_fn "__zeno_completion_cleanup_"(random)
            function $cleanup_fn --on-signal INT --on-signal TERM --inherit-variable selected_file --inherit-variable cleanup_fn
                rm -f $selected_file
                functions -e $cleanup_fn 2>/dev/null
            end
            printf '%s\0' $out > $selected_file

            set -l callback_result (zeno-call-client-and-fallback --zeno-mode=completion-callback \
                --input.lbuffer="$lbuffer" \
                --input.rbuffer="$rbuffer" \
                --input.completionCallback.sourceId="$source_id" \
                --input.completionCallback.expectKey="$expect_key" \
                --input.completionCallback.selectedFile="$selected_file")
            set -l callback_status $status
            rm -f $selected_file
            functions -e $cleanup_fn 2>/dev/null

            if test $callback_status -eq 0 -a "$callback_result[1]" = "success"
                set -l result_command $callback_result[2]
                if test -n "$result_command"
                    set out (bash -c "$result_command" | string split0)
                else
                    set out
                end

                set filtered_out
                for item in $out
                    if test -n "$item"
                        set -a filtered_out $item
                    end
                end
                set out $filtered_out
            end
        end
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
