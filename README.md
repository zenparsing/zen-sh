## Overview ##

**zen-sh** allows you to open up a shell and execute commands asynchronously using
tagged template strings.

## Installing ##

**zen-sh** is an experimental ES6 module.  First, install the latest version
of [es6now](https://github.com/zenparsing/es6now) (a wrapper around Node which allows you
to use ES6 features).  Then install using NPM:

```
npm install zen-sh
```

## API ##

### openShell(options = {}) ###

Opens a shell as a child process and returns a function suitable for tagging template
strings.

The following options can be specified:

- **env**: An object containing shell environment variables.  Defaults to `process.env`.
- **shell**:  The shell program to use.  Defaults to `env.SHELL`.
- **cwd**:  The initial working directory.

When called, the returned function will execute the command string in the shell, and
return a promise for the command's completion.

The returned promise has an attached `pipe` method, which can be used to pipe standard
output or standard error to an arbitrary stream.

## Examples ##

### Automating GIT fetches from Javascript ###

```js
import { openShell } from "package:zen-sh";
import { settings } from "settings.js";

export async function main() {

    let sh = openShell({ cwd: settings.src });

    for (let repo of settings.repos) {

        console.log(`Fetching latest commits to ${ repo }`);
    
        await sh`cd ${ repo }`;
        await sh`git fetch origin`.pipe(process.stdout, process.stderr);
        await sh`cd ../`;
    }
    
    await sh`exit`;
}

```
