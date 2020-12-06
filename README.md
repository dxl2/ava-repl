## AVAX Getting Started Guide with REPL
Here's how to use ava-repl to easily get through the [Ava Getting Started Guide](https://docs.avax.network/v1.0/en/quickstart/). Try tab completion for assistance if you get stuck.

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
avm getBalance X-fuji194w4e3gu4f5gx0ej77e3pcldesu03tlvyw95y0
``` 
Let's send some AVAX. Remember to use tab completion for help if you're not sure about the arguments
```
avm send X-fuji1j6ax63vv6mg8wcsgaas2ctdqgsusfptn743pt4 X-fuji194w4e3gu4f5gx0ej77e3pcldesu03tlvyw95y0 10000
```
AVAX-repl automatically tracks and polls the status of any transactions you've submitted. It lets you know if the transaction is accepted. To see status of recently your recent transactions:
```
avm listTxs
```

Let's create a P-Chain address to prepare for staking.
```
platform createAddress
```
Now we transfer some AVAX from X-Chain to our newly created P-Chain account P-fuji1v2d6k4h0mc5lzt6kdy7j3mxed7n8qjfkcawf0y

To start we first export from X-Chain
```
avm exportAVAX P-fuji1v2d6k4h0mc5lzt6kdy7j3mxed7n8qjfkcawf0y 2000000
```

Wait a few seconds until the ava-repl reports back Transaction accepted. Then we import to P-Chain
```
platform importAVAX P-fuji1v2d6k4h0mc5lzt6kdy7j3mxed7n8qjfkcawf0y
```

importAva also issues the transaction automatically. So it combines platform.importAva and platform.issueTx into 1 step for your convenience.

Now we can check the balance of our platform address:
```
platform getBalance P-fuji1v2d6k4h0mc5lzt6kdy7j3mxed7n8qjfkcawf0y
```

Next we add our node to the default subnet. 
```
platform addValidator P-fuji1v2d6k4h0mc5lzt6kdy7j3mxed7n8qjfkcawf0y 10000 1
```

We can check pending and current validators as follows:
```
platform getPendingValidators
```

```
platform getCurrentValidators
```

# Avalanche REPL Shell

A full featured REPL shell and CLI for Ava. This tool can be used in either REPL mode or standalone mode. 
It supports tab completion, context switching, Keystore credentials caching, tracking submitted transaction status, and more.

## Build Instructions
```
npm install
npm run build
node build/AvaShell.js
```

## REPL Shell Usage
After starting the shell, input `help` to see full list of supported commands and invocation arguments. Tab completion works at both global and contextual levels.
```
node build/AvaShell.js

****************************************
Avalanche shell initialized.
Node ID: 2UycRkXQJYYypBwETMM8Hx5tXsLzCTBs5
****************************************
ava> avm getBalance X-fuji1j6ax63vv6mg8wcsgaas2ctdqgsusfptn743pt4
Balance on X-fuji1j6ax63vv6mg8wcsgaas2ctdqgsusfptn743pt4 for asset AVAX: 8990
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
X-fuji1j6ax63vv6mg8wcsgaas2ctdqgsusfptn743pt4
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