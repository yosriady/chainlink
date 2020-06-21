/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import cli from 'cli-ux'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { RuntimeConfigParser, RuntimeConfig } from '../services/runtimeConfig'
import {
  findABI,
  parseArrayInputs,
  isValidSignature,
  getFunctionABI,
  getFunctionName,
  initWallet,
} from '../services/utils'

const conf = new RuntimeConfigParser()

export interface ExecOverrides {
  gasPrice?: number
  gasLimit?: number
  nonce?: number
  value?: number
}

export default class Exec extends Command {
  static description = 'Executes a chainlink smart contract write function.'

  static examples = [
    'belt exec [<options>] <<version/contract> <address> <fsig> [<args>]',
    "belt exec v0.6/AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'addAccess(address)' 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD",
    "belt exec v0.6/AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'addOracles(address[],address[],uint32,uint32,uint32)' [0x67b260DffCE59E890CfAe9ec733921357732f90a] [0xd9e6eCFfd3Acb20f80D1BCce3d078653B4E7f87D] 1 3 600",
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    gasPrice: flags.integer({
      char: 'g',
      description: 'Gas price',
    }),
    gasLimit: flags.integer({
      char: 'l',
      description: 'Gas limit',
    }),
    nonce: flags.integer({
      char: 'n',
      description: 'Nonce',
    }),
    value: flags.integer({
      char: 'v',
      description: 'Value',
    }),
  }

  static args: Parser.args.IArg[] = [
    {
      name: 'versionedContractName',
      description:
        'Version and name of the chainlink contract e.g. v0.6/FluxAggregator',
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
    const { args, argv, flags } = this.parse(Exec)

    // Check .beltrc exists
    let config: RuntimeConfig
    try {
      config = conf.load()
    } catch (e) {
      this.error(chalk.red(e))
    }

    // Load transaction overrides
    const overrides: ExecOverrides = {
      gasPrice: flags.gasPrice || config.gasPrice,
      gasLimit: flags.gasLimit || config.gasLimit,
      ...(flags.nonce && { nonce: flags.nonce }),
      ...(flags.value && { value: flags.value }),
    }

    // Initialize ethers wallet (signer + provider)
    const wallet = initWallet(config)

    await this.execContract(
      wallet,
      args.versionedContractName,
      args.contractAddress,
      args.functionSignature,
      argv,
      overrides,
    )
  }

  private async execContract(
    wallet: ethers.Wallet,
    versionedContractName: string,
    contractAddress: string,
    functionSignature: string,
    argv: string[],
    overrides: ExecOverrides,
  ) {
    // Find contract ABI
    const { found, abi } = findABI(versionedContractName)
    if (!found) {
      this.error(
        chalk.red(
          `${versionedContractName} ABI not found - Run 'belt compile'`,
        ),
      )
    }

    // Validate function signature
    if (!isValidSignature(functionSignature)) {
      this.error(
        chalk.red(
          "Invalid function signature - Example: belt call ... 'hasAccess(address,bytes)'",
        ),
      )
    }
    const functionName = getFunctionName(functionSignature)
    const functionABI = getFunctionABI(abi, functionName)
    if (!functionABI) {
      this.error(
        chalk.red(
          `function ${functionSignature} not found in ${versionedContractName}`,
        ),
      )
    }

    // Validate command inputs against function inputs
    const numFunctionInputs = functionABI['inputs'].length
    const commandInputs = argv.slice(Object.keys(Exec.args).length)
    if (numFunctionInputs !== commandInputs.length) {
      this.error(
        chalk.red(
          `Received ${commandInputs.length} arguments, constructor expected ${numFunctionInputs}`,
        ),
      )
    }

    // Transforms string arrays to arrays
    const parsedInputs = parseArrayInputs(commandInputs)

    // Initialize contract
    const contract = new ethers.Contract(
      contractAddress,
      abi['compilerOutput']['abi'],
      wallet,
    )

    // Call contract
    try {
      cli.action.start(
        `Executing ${versionedContractName} ${functionSignature} ${parsedInputs.toString()} `,
      )
      const tx = await contract[functionSignature](...parsedInputs, overrides)
      const receipt = await tx.wait() // defaults to 1 confirmation
      cli.action.stop(`Executed in tx ${receipt.transactionHash}`)
      this.log(receipt.transactionHash)
    } catch (e) {
      this.error(chalk.red(e))
    }
  }
}
