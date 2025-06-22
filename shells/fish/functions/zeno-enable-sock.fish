function zeno-enable-sock --description "Enable socket mode for zeno"
    set -gx ZENO_ENABLE_SOCK 1
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
    
    if not set -q ZENO_SOCK
        set -gx ZENO_SOCK "$ZENO_SOCK_DIR/zeno-$fish_pid.sock"
    end
    
    # Export functions to global scope by defining them
    # (In Fish, functions are automatically available after definition)
end
