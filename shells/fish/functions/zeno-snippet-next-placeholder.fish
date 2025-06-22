function zeno-snippet-next-placeholder --description "Navigate to next snippet placeholder"
    # Get current command line state
    set -l buffer (commandline -b)
    set -l cursor (commandline -C)
    
    # Calculate LBUFFER and RBUFFER equivalents
    if test -z "$buffer"
        set -l lbuffer ""
        set -l rbuffer ""
    else
        set -l lbuffer (string sub -s 1 -l $cursor -- $buffer)
        set -l rbuffer (string sub -s (math $cursor + 1) -- $buffer)
    end
    
    # Call zeno with next-placeholder mode
    set -l out (zeno-call-client-and-fallback --zeno-mode=next-placeholder \
        --input.lbuffer="$lbuffer" \
        --input.rbuffer="$rbuffer" | string split \n)
    
    # Update buffer and cursor if successful
    if test "$out[1]" = "success" -a -n "$out[2]"
        commandline -r $out[2]
        commandline -C $out[3]
    end
end
