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
    # Determine server binary path
    set -l server_bin "$ZENO_ROOT/bin/zeno-server"
    if set -q ZENO_SERVER_BIN
        set server_bin $ZENO_SERVER_BIN
    end
    
    # Start the server in background with proper process management
    # Use a more reliable method to capture PID
    set -l pid_file "$ZENO_SOCK_DIR/zeno-server.pid"
    
    # Use setsid if available to create a new session
    if command -q setsid
        # Start server and write its PID to a file
        fish -c "setsid $server_bin > /dev/null 2>&1 & echo \$last_pid > $pid_file" &
    else
        # Fallback to fish -c for older systems
        fish -c "exec $server_bin > /dev/null 2>&1 & echo \$last_pid > $pid_file" &
    end
    
    # Wait for PID file to be created
    set -l pid_wait_count 0
    while test $pid_wait_count -lt 10  # 1 second timeout for PID file
        if test -f $pid_file
            set -l server_pid (cat $pid_file)
            rm -f $pid_file  # Clean up PID file
            break
        end
        sleep 0.1
        set pid_wait_count (math $pid_wait_count + 1)
    end
    
    # If we couldn't get PID, fail
    if not set -q server_pid
        echo "zeno: Failed to get server PID" >&2
        return 1
    end
    
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
