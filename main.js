const spawn = require("child_process").spawn;

const END_SIGNATURE = "end-of-command-sequence",
      END_PATTERN = /end-of-command-sequence:(\d+)\n$/;

export function openShell(options = {}) {

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
        outStream = null;
        errStream = null;
        output = "";
        error = "";
    }

    let child = spawn(shell, { cwd }),
        current = null,
        outStream = null,
        errStream = null,
        output = "",
        error = "";

    child.on("close", code => {

        child = null;

        if (current) {

            // TODO: attach code?
            if (code) current.reject(new Error(error));
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

            // TODO:  attach code?
            if (code) current.reject(new Error(error));
            else current.resolve({ output, error });

            reset();

        } else {

            if (outStream) outStream.write(data);
            else output += data;
        }
    });

    child.stderr.on("data", data => {

        if (!current)
            return;

        if (errStream) stderr.write(errStream);
        else error += data;
    });

    function pipe(out = null, err = null) {

        outStream = out;
        errStream = err;

        if (out && output) {

            out.write(output);
            output = "";
        }

        if (err && error) {

            err.write(error);
            error = "";
        }

        return this;
    }

    return (callSite, ...args) => {

        var p = new Promise((resolve, reject) => {

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

        p.pipe = pipe;

        return p;
    }
}
