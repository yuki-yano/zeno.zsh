# Fisher-compatible loader for zeno.zsh
# This file handles both Fisher installation and regular loading

# Installation event handler
function __zeno_install --on-event zeno_install
    echo "Installing zeno.zsh..." >&2
    
    # Clone the full repository to a local directory
    set -l zeno_dir "$HOME/.local/share/zeno.zsh"
    
    if test -d $zeno_dir
        echo "Updating existing zeno.zsh installation..." >&2
        command git -C $zeno_dir pull
    else
        echo "Cloning zeno.zsh repository..." >&2
        command git clone https://github.com/yuki-yano/zeno.zsh $zeno_dir
    end
    
    # Set universal variables
    set -Ux ZENO_ROOT $zeno_dir
    set -Ua fish_function_path $zeno_dir/shells/fish/functions
    
    echo "zeno.zsh installed successfully!" >&2
    echo "Please restart your Fish shell to apply changes." >&2
end

# Update event handler
function __zeno_update --on-event zeno_update
    if set -q ZENO_ROOT
        echo "Updating zeno.zsh..." >&2
        command git -C $ZENO_ROOT pull
        echo "zeno.zsh updated successfully!" >&2
    end
end

# Uninstall event handler
function __zeno_uninstall --on-event zeno_uninstall
    echo "Uninstalling zeno.zsh..." >&2
    
    # Remove from fish_function_path
    if set -q ZENO_ROOT
        set -l idx (contains -i $ZENO_ROOT/shells/fish/functions $fish_function_path)
        and set -e fish_function_path[$idx]
    end
    
    # Remove universal variables
    set -e ZENO_ROOT
    
    echo "zeno.zsh uninstalled. Repository remains at ~/.local/share/zeno.zsh" >&2
    echo "Remove it manually if desired: rm -rf ~/.local/share/zeno.zsh" >&2
end

# Regular loading (when Fish starts)
if set -q ZENO_ROOT
    # Source the actual implementation
    set -l zeno_config $ZENO_ROOT/shells/fish/conf.d/zeno.fish
    if test -f $zeno_config
        source $zeno_config
    end
else
    # ZENO_ROOT not set, check if we need to set it up
    set -l zeno_dir "$HOME/.local/share/zeno.zsh"
    if test -d $zeno_dir
        set -gx ZENO_ROOT $zeno_dir
        if not contains $zeno_dir/shells/fish/functions $fish_function_path
            set -gx fish_function_path $zeno_dir/shells/fish/functions $fish_function_path
        end
        # Source the actual implementation
        set -l zeno_config $ZENO_ROOT/shells/fish/conf.d/zeno.fish
        if test -f $zeno_config
            source $zeno_config
        end
    else
        echo "zeno.zsh is not installed. Run '__zeno_install' to complete installation." >&2
    end
end
