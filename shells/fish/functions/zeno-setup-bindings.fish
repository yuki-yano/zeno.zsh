function zeno-setup-bindings --description "Setup zeno key bindings with proper priority"
    # Remove default tab completion binding
    bind --erase tab
    bind --erase \t
    
    # Set zeno bindings
    bind \t zeno-completion
    bind tab zeno-completion
    
    # Other bindings
    bind ' ' zeno-auto-snippet
    bind \r zeno-auto-snippet-and-accept-line
    bind \n zeno-auto-snippet-and-accept-line
    
    echo "Zeno key bindings have been set up:"
    echo "  Tab: zeno-completion"
    echo "  Space: zeno-auto-snippet"
    echo "  Enter: zeno-auto-snippet-and-accept-line"
end