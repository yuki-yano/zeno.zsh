function zeno-stop-server --description "Stop zeno socket server"
    # Try to get PID from stored variable first
    set -l pid_to_kill ""
    
    # Check if we have a stored server PID
    if set -q ZENO_SERVER_PID; and test -n "$ZENO_SERVER_PID"
        set pid_to_kill $ZENO_SERVER_PID
    else
        # Fallback to getting PID from server
        zeno-set-pid
        if test -n "$ZENO_PID"
            set pid_to_kill $ZENO_PID
        end
    end
    
    # Kill the server if we have a PID
    if test -n "$pid_to_kill"
        # First try SIGTERM for graceful shutdown
        if kill -TERM $pid_to_kill 2>/dev/null
            # Wait a bit for graceful shutdown
            set -l wait_count 0
            while test $wait_count -lt 10  # 1 second timeout
                if not kill -0 $pid_to_kill 2>/dev/null
                    break
                end
                sleep 0.1
                set wait_count (math $wait_count + 1)
            end
            
            # Force kill if still running
            if kill -0 $pid_to_kill 2>/dev/null
                kill -KILL $pid_to_kill 2>/dev/null
            end
        end
    end
    
    # Clean up
    set -gx ZENO_PID ""
    set -e ZENO_SERVER_PID
    
    # Remove socket file (might be stale)
    if test -e $ZENO_SOCK
        rm -f $ZENO_SOCK
    end
end
