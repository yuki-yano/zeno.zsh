function zeno-set-pid --description "Set zeno server PID"
    # Only try to get PID if socket exists and is a socket file
    if test -z "$ZENO_PID" -a -S "$ZENO_SOCK"
        # Try to get PID with error handling
        set -l pid_result (zeno-client --zeno-mode=pid 2>/dev/null)
        
        # Validate the PID is numeric and the process exists
        if test -n "$pid_result"; and string match -qr '^[0-9]+$' $pid_result
            if kill -0 $pid_result 2>/dev/null
                set -gx ZENO_PID $pid_result
            else
                # Process doesn't exist, clean up socket
                rm -f $ZENO_SOCK
                set -gx ZENO_PID ""
            end
        end
    end
end
