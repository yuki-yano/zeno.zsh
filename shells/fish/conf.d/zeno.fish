# Check if deno is available
if not command -q deno
    return
end

# Set ZENO_ROOT if not already set
# In Fish, we need to find the directory containing this file
if not set -q ZENO_ROOT
    # Get the path to this config file (resolve symlinks)
    set -l config_path (realpath (status --current-filename) 2>/dev/null; or status --current-filename)
    
    # Check if we're in a Fisher installation (config is in ~/.config/fish/conf.d/)
    if string match -q "*/.config/fish/conf.d/*" $config_path
        # For Fisher installations, find the fisher path
        set -l fisher_path $HOME/.config/fish/fisher
        if test -d $fisher_path
            # Look for the zeno.zsh installation
            for dir in $fisher_path/*
                if test -f $dir/zeno.zsh
                    set -gx ZENO_ROOT $dir
                    break
                end
            end
        end
    else
        # For manual installations, navigate up from shells/fish/conf.d/ to the root
        set -gx ZENO_ROOT (dirname (dirname (dirname (dirname $config_path))))
    end
end

# Check if ZENO_ROOT was successfully set
if not set -q ZENO_ROOT
    echo "Warning: ZENO_ROOT could not be determined. Please set it manually:" >&2
    echo "  set -gx ZENO_ROOT /path/to/zeno.zsh" >&2
    return 1
end

# Add bin to PATH
if set -q ZENO_ROOT; and not contains $ZENO_ROOT/bin $PATH
    set -gx PATH $ZENO_ROOT/bin $PATH
end

# Add functions to fish_function_path
# This is needed for both manual and Fisher installations since functions are in shells/fish/
# Do not add `--export` option to avoid conflicts with other plugins (like tide)
if set -q ZENO_ROOT; and test -d $ZENO_ROOT/shells/fish/functions
    if not contains $ZENO_ROOT/shells/fish/functions $fish_function_path
        set -g fish_function_path $ZENO_ROOT/shells/fish/functions $fish_function_path
    end
end

# Set FZF command
if not set -q ZENO_ENABLE_FZF_TMUX
    set -gx ZENO_FZF_COMMAND "fzf"
else
    set -gx ZENO_FZF_COMMAND "fzf-tmux"
end

# Cache Deno dependencies unless disabled
if set -q ZENO_ROOT; and not set -q ZENO_DISABLE_EXECUTE_CACHE_COMMAND
    command deno cache --unstable-byonm --no-lock --no-check -- "$ZENO_ROOT/src/cli.ts"
end

# Socket support
if not set -q ZENO_DISABLE_SOCK; or test -z "$ZENO_DISABLE_SOCK"
    # Check Deno version
    set -l deno_version (deno -V | string match -r '\d+\.\d+\.\d+')
    set -l version_parts (string split . $deno_version)
    set -l version_num (math "$version_parts[1] * 10000 + $version_parts[2] * 100 + $version_parts[3]")
    
    if test $version_num -ge 11600
        zeno-enable-sock
        
        # Set up hooks for directory change and exit
        function __zeno_on_pwd_change --on-variable PWD
            zeno-onchpwd
        end
        
        function __zeno_on_exit --on-event fish_exit
            zeno-stop-server
        end
        
        # Set PID on prompt (similar to precmd in zsh)
        function __zeno_set_pid --on-event fish_prompt
            zeno-set-pid
        end
    else
        set -gx ZENO_DISABLE_SOCK 1
    end
end

# Set flags to indicate zeno is loaded
set -gx ZENO_ENABLE 1
set -gx ZENO_LOADED 1

# Add Fish functions directory to function path (safety check)
if set -q ZENO_ROOT; and not contains $ZENO_ROOT/shells/fish/functions $fish_function_path
    set -g fish_function_path $ZENO_ROOT/shells/fish/functions $fish_function_path
end
