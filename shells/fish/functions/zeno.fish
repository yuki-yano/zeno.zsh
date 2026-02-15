function zeno
    set -l deno_flags --unstable-byonm --no-check \
        --allow-env --allow-read --allow-run --allow-write --allow-ffi --allow-net
    set -l quiet 0

    for i in (seq (count $argv))
        switch $argv[$i]
            case '--zeno-mode=auto-snippet' '--zeno-mode=completion' '--zeno-mode=completion-callback' '--zeno-mode=completion-preview'
                set quiet 1
                break
            case '--zeno-mode'
                if test (math $i + 1) -le (count $argv)
                    switch $argv[(math $i + 1)]
                        case auto-snippet completion completion-callback completion-preview
                            set quiet 1
                            break
                    end
                end
        end
    end

    if test $quiet -eq 1
        set -a deno_flags --quiet
    end

    command deno run $deno_flags -- "$ZENO_ROOT/src/cli.ts" $argv
end
