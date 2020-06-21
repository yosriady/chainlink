/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import cli from 'cli-ux'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { RuntimeConfigParser, RuntimeConfig } from '../services/runtimeConfig'
import { getNetworkName, findABI, parseArrayInputs } from '../services/utils'

const conf = new RuntimeConfigParser()

export default class Exec extends Command {
  static description = 'Executes a chainlink smart contract write function.'

  static examples = [
    'belt exec [<options>] <<version/contract> <address> <fsig> [<args>]',
    "belt exec v0.6/AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'addAccess(address)' 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD",
    "belt exec v0.6/AccessControlledAggregator 0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD 'addOracles(address[],address[],uint32,uint32,uint32)' [0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD] [0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD] 1 3 600",
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    // TODO: Add override flags for gas price, gas limit, nonce
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
    const { args, argv } = this.parse(Exec)

    await this.execContract(
      args.versionedContractName,
      args.contractAddress,
      args.functionSignature,
      argv,
    )
  }

  private async execContract(
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

    // Transforms string arrays to arrays
    const parsedInputs = parseArrayInputs(commandInputs)

    // Initialize ethers wallet (signer + provider)
    const signer = initSigner(config)

    // Initialize contract
    const contract = new ethers.Contract(
      contractAddress,
      abi['compilerOutput']['abi'],
      signer,
    )

    // Load transaction overrides
    // TODO: pick up for flags with priority
    // TODO: nonce
    const gasPrice = config.gasPrice
    const gasLimit = config.gasLimit

    // Call contract
    try {
      cli.action.start(
        `Executing ${versionedContractName} ${functionSignature} ${parsedInputs.toString()} `,
      )
      const tx = await contract[functionSignature](...parsedInputs, {
        gasPrice,
        gasLimit,
      })
      const receipt = await tx.wait() // defaults to 1 confirmation
      cli.action.stop(`Executed in tx ${receipt.transactionHash}`)
      this.log(receipt.transactionHash)
    } catch (e) {
      this.error(chalk.red(e))
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
    { projectId: config.infuraProjectId },
  )
  let wallet = ethers.Wallet.fromMnemonic(config.mnemonic)
  wallet = wallet.connect(provider)
  return wallet
}
