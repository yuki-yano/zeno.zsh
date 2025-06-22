function zeno-auto-snippet --description "Auto expand snippets in Fish"
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
    
    # Call zeno with auto-snippet mode
    set -l out (zeno-call-client-and-fallback --zeno-mode=auto-snippet \
        --input.lbuffer="$lbuffer" \
        --input.rbuffer="$rbuffer" | string split \n)
    
    # Check if ZENO is disabled or if the call failed
    if test "$ZENO_ENABLE" = "0"; or test "$out[1]" != "success"
        # Fallback behavior - insert a space
        # This is equivalent to Zsh's self-insert
        if set -q ZENO_AUTO_SNIPPET_FALLBACK
            # TODO: Implement custom fallback behavior
            commandline -i " "
        else
            commandline -i " "
        end
        return
    end
    
    # Update buffer and cursor if successful
    if test -n "$out[2]"
        commandline -r $out[2]
        commandline -C $out[3]
    end
    
    # Repaint the command line (equivalent to zle reset-prompt)
    commandline -f repaint
end
