/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { getNetworkName, findABI, parseArrayInputs } from '../services/utils'
import { RuntimeConfigParser } from '../services/runtimeConfig'

const conf = new RuntimeConfigParser()

export default class Call extends Command {
  static description = 'Calls a chainlink smart contract read-only function.'

  static examples = [
    'belt call [<options>] <version/contract> <address> <fsig> [<args>]',
    "belt call v0.6/AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'description()'",
    "belt call v0.6/SimpleAccessControl 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'hasAccess(address,bytes)' 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD '0x'",
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
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
    const { args, argv } = this.parse(Call)

    await this.callContract(
      args.versionedContractName,
      args.contractAddress,
      args.functionSignature,
      argv,
    )
  }

  private async callContract(
    versionedContractName: string,
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

    // Validate command inputs against function inputs
    const functionName = getFunctionName(functionSignature)
    const functionABI = getFunctionABI(abi, functionName)
    const numFunctionInputs = functionABI['inputs'].length
    const commandInputs = argv.slice(Object.keys(Call.args).length)
    if (numFunctionInputs !== commandInputs.length) {
      this.error(
        chalk.red(
          `Received ${commandInputs.length} arguments, ${functionSignature} expected ${numFunctionInputs}`,
        ),
      )
    }

    // Transforms string arrays to arrays
    const parsedInputs = parseArrayInputs(commandInputs)

    // Initialize ethers provider
    const provider = new ethers.providers.InfuraProvider(
      getNetworkName(config.chainId),
      { projectId: config.infuraProjectId },
    )

    // Initialize contract
    const contract = new ethers.Contract(
      contractAddress,
      abi['compilerOutput']['abi'],
      provider,
    )

    // Call contract
    try {
      const result = await contract[functionSignature](...parsedInputs)
      this.log(result)
    } catch (e) {
      this.error(e)
    }
  }
}

function isValidSignature(functionSignature: string) {
  const leftParenIdx = functionSignature.indexOf('(')
  const rightParenIdx = functionSignature.indexOf(')')
  const validParens =
    leftParenIdx > -1 && rightParenIdx > -1 && rightParenIdx > leftParenIdx
  return validParens
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
