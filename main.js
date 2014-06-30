const END_SIGNATURE = "end-of-command-sequence",
      END_PATTERN = /end-of-command-sequence:(\d+)\n$/;
      
export function createShell(options = {}) {

    const { 
        
        env = process.env, 
        shell = env.SHELL,
        cwd = null 
        
    } = options;

    function escape(arg) {

        // TODO: This needs much more work
        return arg.replace(/\s/g, "\\$&");
    }
    
    function reset() {
    
        current = null;
        output = "";
        error = "";
    }
    
    let child = spawn(shell, { cwd }),
        current = null,
        output = "",
        error = "";
    
    child.on("close", code => {
    
        child = null;
        
        if (current) {
            
            if (code) current.reject(new Error(code));
            else current.resolve({ output, error });
            
            reset();
        }
    });
    
    child.stdout.on("data", data => { 
    
        if (!current)
            return;
        
        let m = END_PATTERN.exec(data);
        
        if (m) {
        
            let code = parseInt((m[1] || "").trim());
            
            if (code) current.reject(new Error(error));
            else current.resolve({ output, error });
            
            reset();
            
        } else {
        
            output += data;
        }
    });
    
    child.stderr.on("data", data => {
    
        if (!current)
            return;
        
        error += data;
    });
    
    return (callSite, ...args) => {

        return new Promise((resolve, reject) => {
        
            if (!child)
                reject(new Error("Process closed"));
            
            if (current)
                reject(new Error("Command in progress"));
            
            current = { resolve, reject };
    
            let cmd = "";
        
            for (let i = 0; i < callSite.length; ++i) {
        
                cmd += callSite[i];
                if (i < args.length) cmd += escape(args[i]);
            }
            
            cmd += `; echo ${ END_SIGNATURE }:$?\n`;
            
            child.stdin.write(cmd);
        });
    }
}
