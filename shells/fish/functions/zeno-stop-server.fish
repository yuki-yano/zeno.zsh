function zeno-stop-server --description "Stop zeno socket server"
    zeno-set-pid
    if test -n "$ZENO_PID"
        kill $ZENO_PID 2>/dev/null
        set -gx ZENO_PID ""
        rm -f $ZENO_SOCK
    end
end
