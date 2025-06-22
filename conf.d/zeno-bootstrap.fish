# Bootstrap file for Fisher installation
# This file loads the actual zeno.fish from the proper location

# Get the directory where this bootstrap file is located
set -l bootstrap_dir (dirname (status -f))

# Source the main zeno.fish configuration
set -l zeno_config $bootstrap_dir/../shells/fish/conf.d/zeno.fish
if test -f $zeno_config
    source $zeno_config
else
    echo "Warning: Could not find zeno.fish at $zeno_config" >&2
end