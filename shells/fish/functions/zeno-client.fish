function zeno-client --description "Send request to zeno socket server"
    # Check if socket exists
    if not test -S $ZENO_SOCK
        return 1
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
    
    # Send to socket and receive response
    # Fish doesn't have built-in socket support, so we use netcat or socat
    if command -q nc
        echo -n $json_payload | nc -U $ZENO_SOCK
    else if command -q socat
        echo -n $json_payload | socat - UNIX-CONNECT:$ZENO_SOCK
    else
        echo "Error: Neither nc nor socat is available for socket communication" >&2
        return 1
    end
end