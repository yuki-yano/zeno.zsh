function zeno-start-server --description "Start zeno socket server in background"
    # Create socket directory if it doesn't exist
    if not test -d (dirname $ZENO_SOCK)
        mkdir -p (dirname $ZENO_SOCK)
    end
    
    # Start server in background
    # Fish doesn't have nohup built-in, but we can use command nohup
    if set -q ZENO_SERVER_BIN
        set -l server_bin $ZENO_SERVER_BIN
    else
        set -l server_bin "$ZENO_ROOT/bin/zeno-server"
    end
    
    # Start the server in background and detach it
    fish -c "exec $server_bin > /dev/null 2>&1" &
    disown
end
