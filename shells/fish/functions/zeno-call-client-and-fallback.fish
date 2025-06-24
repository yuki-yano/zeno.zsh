function zeno-call-client-and-fallback
    if not set -q ZENO_DISABLE_SOCK; or test -z "$ZENO_DISABLE_SOCK"
        # Ensure zeno-enable-sock has been called
        if not functions -q zeno-client
            zeno-enable-sock
        end
        
        # Check if socket exists
        if test -S $ZENO_SOCK
            zeno-client $argv
            return
        end
        
        # Socket doesn't exist, try to start server
        zeno-start-server
    end
    
    # Fallback to direct zeno call
    zeno $argv
end
