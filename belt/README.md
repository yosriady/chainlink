# @chainlink/belt

A toolbelt for performing various commands on chainlink smart contracts.
This cli tool is currently used within `@chainlink/contracts` for the usage of running
build and development tools across multiple solidity contract verisions.

<!-- toc -->
* [@chainlink/belt](#chainlinkbelt)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @chainlink/belt
$ belt COMMAND
running command...
$ belt (-v|--version|version)
@chainlink/belt/0.0.1 linux-x64 node-v10.16.3
$ belt --help [COMMAND]
USAGE
  $ belt COMMAND
...
```
<!-- usagestop -->

<!-- usage -->
```sh-session
$ cd evm-contracts/
# belt compile solc
$ belt init

$ belt deploy ...
$ belt exec ...
$ belt call ...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`belt box [PATH]`](#belt-box-path)
* [`belt compile [COMPILER]`](#belt-compile-compiler)
* [`belt init`](#belt-init)
* [`belt deploy`](#belt-deploy)
* [`belt exec`](#belt-exec)
* [`belt call`](#belt-call)
* [`belt help [COMMAND]`](#belt-help-command)

## `belt box [PATH]`

Modify a truffle box to a specified solidity version

```
USAGE
  $ belt box [PATH]

ARGUMENTS
  PATH  the path to the truffle box

OPTIONS
  -d, --dryRun         output the replaced strings, but dont change them
  -h, --help           show CLI help
  -i, --interactive    run this command in interactive mode
  -l, --list           list the available solidity versions

  -s, --solVer=solVer  the solidity version to change the truffle box to
                       either a solidity version alias "v0.6" | "0.6" or its full version "0.6.2"

EXAMPLES
  belt box --solVer 0.6 -d path/to/box
  belt box --interactive path/to/box
  belt box -l
```

_See code: [src/src/commands/box.ts](https://github.com/smartcontractkit/chainlink/blob/v0.0.1/src/src/commands/box.ts)_

## `belt compile [COMPILER]`

Run various compilers and/or codegenners that target solidity smart contracts.

```
USAGE
  $ belt compile [COMPILER]

ARGUMENTS
  COMPILER  (solc|ethers|truffle|all) Compile solidity smart contracts and output their artifacts

OPTIONS
  -c, --config=config  [default: app.config.json] Location of the configuration file
  -h, --help           show CLI help

EXAMPLE
  $ belt compile all

  Creating directory at abi/v0.4...
  Creating directory at abi/v0.5...
  Creating directory at abi/v0.6...
  Compiling 35 contracts...
  ...
  ...
  Aggregator artifact saved!
  AggregatorProxy artifact saved!
  Chainlink artifact saved!
  ...
```

_See code: [src/src/commands/compile.ts](https://github.com/smartcontractkit/chainlink/blob/v0.0.1/src/src/commands/compile.ts)_

## `belt init`

Initializes a `.beltrc` file. Required for `deploy`, `exec` and `call`.

```
USAGE
  $ belt init [PATH]

ARGUMENTS
  PATH  [default: .] .beltrc filepath

OPTIONS
  -c, --chainId                          Ethereum network to send transactions to e.g. mainnet (1), rinkeby (4)
  -g, --gasPrice                         Default gas price
  -h, --help                             show CLI help
  -l, --gasLimit                         Default gas limit
  -m, --mnemonic                         Mnemonic for Ethereum wallet to send transactions from
  -p, --infuraProjectId  Infura project ID

EXAMPLES
  belt init
  belt init --chainId 4 --mnemonic 'raise clutch area ...' --infuraProjectId fdf38d... my-project/
```

Example `.beltrc` file:

```json
{
    "chainId": 4,
    "mnemonic": "person meat focus web panther man penalty gospel transfer gospel tent mail",
    "infuraProjectId": "fdf38d85d15e434e9b2ca152b7b1bc6f",
    "gasPrice": 40000000000,
    "gasLimit": 8000000,
}
```

> **Note:** `.beltrc` files should always be included in `.gitignore` because they contain sensitive information!

## `belt deploy`

Deploys a chainlink smart contract.

```
USAGE
  $ belt deploy [CONTRACTNAME]

ARGUMENTS
  CONTRACTNAME  Name of the chainlink contract to deploy

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  belt deploy [<options>] <contract> [<args>]
  belt deploy AccessControlledAggregator '0x01be23585060835e02b77ef475b0cc51aa1e0709' 160000000000000000 300 1 1000000000 18 'LINK/USD'

  Deploying AccessControlledAggregator to 0x341869dbD1448a40aB762159264723383b3a6E48 ... Deployed in tx 0x6a47a7bb1f84f9048da11222b0a879d372a9f4ba50511a594b84a833e45eb80f
```

## `belt exec`

Executes a chainlink smart contract write function.

```
USAGE
  $ belt exec [CONTRACTNAME] [CONTRACTADDRESS] [FUNCTIONSIGNATURE]

ARGUMENTS
  CONTRACTNAME       Name of the chainlink contract
  CONTRACTADDRESS    Address of the chainlink contract
  FUNCTIONSIGNATURE  ABI-encoded function signature to call

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  belt exec [<options>] <contract> <address> <fsig> [<args>]
  belt exec AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'addAccess(address)' 0x67b260DffCE59E890CfAe9ec733921357732f90a
```

## `belt call`

Calls a chainlink smart contract read-only function.

```
USAGE
  $ belt call [CONTRACTNAME] [CONTRACTADDRESS] [FUNCTIONSIGNATURE]

ARGUMENTS
  CONTRACTNAME       Name of the chainlink contract
  CONTRACTADDRESS    Address of the chainlink contract
  FUNCTIONSIGNATURE  ABI-encoded function signature to call

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  belt call [<options>] <contract> <address> <fsig> [<args>]
  belt call AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'description()'
```

## `belt help [COMMAND]`

display help for belt

```
USAGE
  $ belt help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_
<!-- commandsstop -->
