function zeno-toggle-auto-snippet --description "Toggle auto snippet expansion"
    if test "$ZENO_ENABLE" = "1"
        set -gx ZENO_ENABLE 0
    else
        set -gx ZENO_ENABLE 1
    end
end