function zeno-start-server --description "Start zeno socket server in background"
    # Create socket directory if it doesn't exist
    if not test -d (dirname $ZENO_SOCK)
        mkdir -p (dirname $ZENO_SOCK)
    end
    
    # Remove stale socket file if it exists
    if test -e $ZENO_SOCK
        rm -f $ZENO_SOCK
    end
    
    # Start server in background
    # Fish doesn't have nohup built-in, but we can use command nohup
    if set -q ZENO_SERVER_BIN
        set -l server_bin $ZENO_SERVER_BIN
    else
        set -l server_bin "$ZENO_ROOT/bin/zeno-server"
    end
    
    # Start the server in background with proper process management
    # Use setsid if available to create a new session
    if command -q setsid
        setsid $server_bin > /dev/null 2>&1 &
    else
        # Fallback to fish -c for older systems
        fish -c "exec $server_bin > /dev/null 2>&1" &
    end
    set -l server_pid $last_pid
    
    # Wait for socket to be created (with timeout)
    set -l wait_count 0
    while test $wait_count -lt 50  # 5 second timeout (50 * 0.1s)
        if test -e $ZENO_SOCK
            # Socket exists, server is ready
            # Store the PID for later use
            set -g ZENO_SERVER_PID $server_pid
            return 0
        end
        sleep 0.1
        set wait_count (math $wait_count + 1)
    end
    
    # Timeout reached, kill the server if it's still running
    if kill -0 $server_pid 2>/dev/null
        kill -TERM $server_pid 2>/dev/null
    end
    
    echo "zeno: Failed to start socket server" >&2
    return 1
end
