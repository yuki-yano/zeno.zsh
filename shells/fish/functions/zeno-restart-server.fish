function zeno-restart-server --description "Restart zeno socket server"
    zeno-stop-server
    zeno-start-server
end
