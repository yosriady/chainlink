/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import cli from 'cli-ux'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { RuntimeConfigParser, RuntimeConfig } from '../services/runtimeConfig'
import { getNetworkName, findABI } from '../services/utils'

const conf = new RuntimeConfigParser()

export default class Exec extends Command {
  static description = 'Executes a chainlink smart contract write function.'

  static examples = [
    'belt exec [<options>] <contract> <address> <fsig> [<args>]',
    "belt exec AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'addAccess(address)' 0x67b260DffCE59E890CfAe9ec733921357732f90a",
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    // TODO: Add override flags for gas price, gas limit, nonce
  }

  static args: Parser.args.IArg[] = [
    {
      name: 'contractName',
      description: 'Name of the chainlink contract',
    },
    {
      name: 'contractAddress',
      description: 'Address of the chainlink contract',
    },
    {
      name: 'functionSignature',
      description: 'ABI-encoded function signature to call',
    },
  ]

  async run() {
    const { args, argv } = this.parse(Exec)

    await this.execContract(
      args.contractName,
      args.contractAddress,
      args.functionSignature,
      argv,
    )
  }

  private async execContract(
    contractName: string,
    contractAddress: string,
    functionSignature: string,
    argv: string[],
  ) {
    // Check .beltrc exists
    let config
    try {
      config = conf.load()
    } catch (e) {
      this.error(chalk.red(e))
    }

    // Find contract ABI
    const { found, abi } = findABI(config, contractName)
    if (!found) {
      this.error(
        chalk.red(`${contractName} ABI not found at - Run 'belt compile'`),
      )
    }

    // Validate command inputs against function inputs
    const functionName = getFunctionName(functionSignature)
    const functionABI = getFunctionABI(abi, functionName)
    const numFunctionInputs = functionABI['inputs'].length
    const commandInputs = argv.slice(Object.keys(Exec.args).length)
    if (numFunctionInputs !== commandInputs.length) {
      this.error(
        chalk.red(
          `Received ${commandInputs.length} arguments, constructor expected ${numFunctionInputs}`,
        ),
      )
    }

    // Initialize ethers wallet (signer + provider)
    const signer = initSigner(config)

    // Initialize contract
    const contract = new ethers.Contract(
      contractAddress,
      abi['compilerOutput']['abi'],
      signer,
    )

    // Call contract
    try {
      cli.action.start(
        `Executing ${contractName} ${functionSignature} ${commandInputs.toString}`,
      )
      // TODO: add overrides e.g. gasprice, gaslimit
      const tx = await contract[functionSignature](...commandInputs, {})
      const receipt = await tx.wait() // defaults to 1 confirmation
      cli.action.stop(`Executed in tx ${receipt.transactionHash}`)
      this.log(receipt.transactionHash)
    } catch (e) {
      this.error(e)
    }
  }
}

function getFunctionName(functionSignature: string) {
  return functionSignature.substr(0, functionSignature.indexOf('('))
}

function getFunctionABI(abi: any, functionName: string) {
  const functionABI = abi['compilerOutput']['abi'].find(
    (i: { type: string; name: string }) => {
      return i.type === 'function' && i.name === functionName
    },
  )
  return functionABI
}

function initSigner(config: RuntimeConfig): ethers.Wallet {
  const provider = new ethers.providers.InfuraProvider(
    getNetworkName(config.chainId),
  )
  let wallet = ethers.Wallet.fromMnemonic(config.mnemonic)
  wallet = wallet.connect(provider)
  return wallet
}
