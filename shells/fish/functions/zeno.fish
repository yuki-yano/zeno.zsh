function zeno
    command deno run --unstable-byonm --no-check \
        --allow-env --allow-read --allow-run --allow-write \
        -- "$ZENO_ROOT/src/cli.ts" $argv
end
