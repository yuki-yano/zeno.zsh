function zeno-client --description "Send request to zeno socket server"
    # Check if socket exists
    if not test -S $ZENO_SOCK
        # Try to start server if socket doesn't exist
        zeno-start-server
        if not test -S $ZENO_SOCK
            return 1
        end
    end
    
    # Prepare arguments as JSON
    set -l json_args
    for arg in $argv
        # Escape for JSON - simpler approach
        set -l escaped $arg
        set escaped (string replace -a '\\' '\\\\' -- $escaped)
        set escaped (string replace -a '"' '\\"' -- $escaped)
        set escaped (string replace -a (printf '\n') '\\n' -- $escaped)
        set escaped (string replace -a (printf '\r') '\\r' -- $escaped)
        set escaped (string replace -a (printf '\t') '\\t' -- $escaped)
        set -a json_args "\"$escaped\""
    end
    
    # Create JSON payload
    set -l json_payload (printf '{"args":[%s]}' (string join ',' -- $json_args))
    
    # Send to socket and receive response with timeout
    # Fish doesn't have built-in socket support, so we use netcat or socat
    set -l result
    set -l exit_code
    
    if command -q nc
        # Use timeout if available
        if command -q timeout
            set result (echo -n $json_payload | timeout 5 nc -U $ZENO_SOCK 2>/dev/null)
        else
            set result (echo -n $json_payload | nc -U $ZENO_SOCK 2>/dev/null)
        end
        set exit_code $status
    else if command -q socat
        set result (echo -n $json_payload | socat -t5 - UNIX-CONNECT:$ZENO_SOCK 2>/dev/null)
        set exit_code $status
    else
        echo "Error: Neither nc nor socat is available for socket communication" >&2
        return 1
    end
    
    # Check if communication failed
    if test $exit_code -ne 0
        # Socket communication failed, try to clean up
        rm -f $ZENO_SOCK
        set -gx ZENO_PID ""
        return 1
    end
    
    # Output result
    # Use string join to preserve newlines in the output
    string join \n -- $result
    return 0
end
