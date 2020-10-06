## AVA Getting Started Guide with REPL
Here's how to use ava-repl to easily get through the [Ava Getting Started Guide](https://docs.avax.network/v1.0/en/quickstart/ava-getting-started/). Try tab completion for assistance if you get stuck.

First create a user.
```
keystore createUser test3 TestingAva123*
```

This caches the user's credential and sets it as active for future commands so you don't have to keep retyping the same username and password. Use `setUser` to switch users. Now create an address
```
avm createAddress
```

Copy the output address (in our case X-CdLNNtfW1CfdJcit1SR53ch1B179mnEFP) and fund it with the [Testnet faucet](https://faucet.avax.network/)

Check balance on address:
```
avm getBalance X-everest1yj5p4akajgxfglukjh4tj9e6n25hmemycfmc4g
``` 
Let's send some AVA. Remember to use tab completion for help if you're not sure about the arguments
```
avm send X-everest16taysp0xh3twp3dj9q04484enz0dwrnvw77p5m X-everest1yj5p4akajgxfglukjh4tj9e6n25hmemycfmc4g 10000
```
AVA-repl automatically tracks and polls the status of any transactions you've submitted. It lets you know if the transaction is accepted. To see status of recently your recent transactions:
```
avm listTxs
```

Let's create a P-Chain address to prepare for staking.
```
platform createAddress
```
Now we transfer some AVA from X-Chain to our newly created P-Chain account P-everest1f40kgwrmuj6td8dpfqp8vl8vcu9fyphugy3a3f

To start we first export from X-Chain
```
avm exportAVAX P-everest1f40kgwrmuj6td8dpfqp8vl8vcu9fyphugy3a3f 20000
```

Wait a few seconds until the ava-repl reports back Transaction accepted. Then we import to P-Chain
```
platform importAVAX P-everest1f40kgwrmuj6td8dpfqp8vl8vcu9fyphugy3a3f
```

Note you do not have to specify a payer nonce. It's optional. ava-repl will find the next nonce if needed. 

importAva also issues the transaction automatically. So it combines platform.importAva and platform.issueTx into 1 step for your convenience.

Now we can check the balance of our platform address:
```
platform getBalance P-everest1f40kgwrmuj6td8dpfqp8vl8vcu9fyphugy3a3f
```

Next we add our node to the default subnet. 
```
platform addValidator P-everest1f40kgwrmuj6td8dpfqp8vl8vcu9fyphugy3a3f 10000 1
```

Again, this is combining the few steps in the Getting Started guide into one: It generates the unsigned transaction, signs it, and issues it. payerNonce is set automatically and nodeId is set to the current node.

We can check pending and current validators as follows:
```
platform getPendingValidators
```

```
platform getCurrentValidators
```

# AVA REPL Shell

A full featured REPL shell and CLI for Ava. This tool can be used in either REPL mode or standalone mode. 
It supports tab completion, context switching, Keystore credentials caching, tracking submitted transaction status, and more.

## Build Instructions
```
npm install
./node_modules/typescript/bin/tsc
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

## Custom Commands
You can easily add your own context and commands to the REPL shell. See Custom.ts for an example.

## Help
Run `help` in REPL to see all supported commands, description of what they do, and invocation instructions.