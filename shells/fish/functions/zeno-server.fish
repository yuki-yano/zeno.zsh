function zeno-server --description "Run zeno server"
    command deno run --unstable-byonm --no-check \
        --allow-env --allow-read --allow-run --allow-write \
        -- "$ZENO_ROOT/src/server.ts" $argv
end
