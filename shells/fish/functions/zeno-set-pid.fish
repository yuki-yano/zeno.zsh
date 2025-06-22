function zeno-set-pid --description "Set zeno server PID"
    if test -z "$ZENO_PID" -a -S "$ZENO_SOCK"
        set -gx ZENO_PID (zeno-client --zeno-mode=pid 2>/dev/null)
    end
end