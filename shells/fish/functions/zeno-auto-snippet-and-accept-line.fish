function zeno-auto-snippet-and-accept-line --description "Expand snippet and execute command"
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
    
    # Update buffer if successful
    if test "$ZENO_ENABLE" = "1" -a "$out[1]" = "success" -a -n "$out[2]"
        commandline -r $out[2]
        # Force a repaint to ensure the new command is visible
        commandline -f repaint
    end
    
    # Execute the command (equivalent to zle accept-line)
    commandline -f execute
end