function zeno-onchpwd --description "Notify zeno server of directory change"
    zeno-client --zeno-mode=chdir --input.dir="$PWD" 2>/dev/null
end