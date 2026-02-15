function zeno-server --description "Run zeno server"
    command deno run --node-modules-dir=auto --no-check \
        --allow-env --allow-read --allow-run --allow-write --allow-net \
        -- "$ZENO_ROOT/src/server.ts" $argv
end
