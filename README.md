# AVA REPL Shell

A full featured REPL shell and CLI for Ava. This tool can be used in either REPL mode or standalone mode. 
It supports tab completion, context switching, Keystore credentials caching, tracking submitted transaction status, and more.

## Build Instructions
```
npm install
./node_modules/typescript/bin/tsc build
node build/AvaShell.js
```

## REPL Shell Usage
After starting the shell, input `help` to see full list of supported commands and invocation arguments. Tab completion works at both global and contextual levels.
```
node build/AvaShell.js

****************************************
AVA shell initialized.
Node ID: 2UycRkXQJYYypBwETMM8Hx5tXsLzCTBs5
****************************************
ava> avm getBalance X-99hXf8QFHnSAE8f3jBLEUuA1ErPw1TQUh
Balance on X-99hXf8QFHnSAE8f3jBLEUuA1ErPw1TQUh for asset AVA: 8990
```

To (optionally) set context for future commands, input `info`, `keystore`, `avm`, or `platform`. The shell prompt will reflect the current context. To clear context, input `exit`. 
You can cache credentials for current active user so you don't need to repeatedly input them.
```
ava> keystore setUser test1 TestingAva123*

ava> avm

ava avm> createAddress
Created Address:
X-5DSRK4P5vtknsCWfqUoFjsXdHmMLsqK5B

ava avm> listAddresses
Addresses for keystore: test1
X-99hXf8QFHnSAE8f3jBLEUuA1ErPw1TQUh
X-25LttFTMh2F766XqjKW3uSb19NojHnXnW
X-5DSRK4P5vtknsCWfqUoFjsXdHmMLsqK5B
```

Keystore credential can also be set as environment variables `AVA_KEYSTORE_USERNAME` and `AVA_KEYSTORE_PASSWORD`.

## CLI Mode Usage
To invoke in CLI mode, simply pass the along the commandline. Make sure to set the environment variables for the Keystore user.
`build/AvaShell.js avm checkTx <tx>`
