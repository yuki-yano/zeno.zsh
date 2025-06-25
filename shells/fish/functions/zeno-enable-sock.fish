function zeno-enable-sock --description "Enable socket mode for zeno"
    set -gx ZENO_PID ""
    
    # Set socket directory and path
    if not set -q ZENO_SOCK_DIR
        if set -q XDG_RUNTIME_DIR
            set -gx ZENO_SOCK_DIR "$XDG_RUNTIME_DIR/zeno-$USER"
        else if set -q TMPDIR
            set -gx ZENO_SOCK_DIR "$TMPDIR/zeno-$USER"
        else
            set -gx ZENO_SOCK_DIR "/tmp/zeno-$USER"
        end
    end
    
    # Create socket directory if it doesn't exist
    if not test -d $ZENO_SOCK_DIR
        mkdir -p $ZENO_SOCK_DIR
        chmod 700 $ZENO_SOCK_DIR  # Secure the directory
    end
    
    if not set -q ZENO_SOCK
        set -gx ZENO_SOCK "$ZENO_SOCK_DIR/zeno-$fish_pid.sock"
    end
    
    # Clean up any stale socket files from crashed sessions
    if test -d $ZENO_SOCK_DIR
        for sock in $ZENO_SOCK_DIR/zeno-*.sock
            if test -e $sock
                # Check if it's a valid socket with a running server
                if not test -S $sock
                    # Not a socket file, remove it
                    rm -f $sock
                else
                    # Try to communicate with it
                    if command -q nc
                        echo '{"args":["--zeno-mode=pid"]}' | nc -U $sock >/dev/null 2>&1
                        if test $status -ne 0
                            # Socket is dead, remove it
                            rm -f $sock
                        end
                    end
                end
            end
        end
    end
    
    # Export functions to global scope by defining them
    # (In Fish, functions are automatically available after definition)
end
