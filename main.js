import { spawn } from "node:child_process";

const END_SIGNATURE = "end-of-command-sequence",
      END_PATTERN = /end-of-command-sequence:(\d+)\n$/;

function escape(arg) {

    return "'" + arg.replace(/'+/g, "'\"$&\"'") + "'";
}

export function command(callSite, ...args) {

    let cmd = "";

    for (let i = 0; i < callSite.length; ++i) {

        cmd += callSite[i];
        if (i < args.length) cmd += escape(args[i]);
    }

    return cmd;
}

export function openShell(options = {}) {

    const {

        env = process.env,
        shell = env.SHELL,
        cwd = null

    } = options;

    function reset() {

        current = null;
        outStream = null;
        errStream = null;
        output = "";
        error = "";
    }

    function extendError(e, code) {

        e.message = error ? "Shell Error: " + error : "Shell Error";
        e.shellOutput = output;
        e.shellError = error;
        e.code = code;

        return e;
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

            if (code) current.reject(extendError(new Error, code));
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

            if (code) current.reject(extendError(new Error, code));
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

        if (errStream) errStream.write(data);
        else error += data;
    });

    function pipe(out = null, err = null) {

        if (!out && !err) {

            out = process.stdout;
            err = process.stderr;
        }

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

            if (typeof callSite === "string")
                callSite = [callSite];

            let cmd = command(callSite, ...args).trim();
            cmd += `;echo ${ END_SIGNATURE }:$?\n`;

            child.stdin.write(cmd);
        });

        p.pipe = pipe;

        return p;
    };
}
