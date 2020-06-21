/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import cli from 'cli-ux'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { RuntimeConfigParser, RuntimeConfig } from '../services/runtimeConfig'
import { getNetworkName, findABI, parseArrayInputs } from '../services/utils'

const conf = new RuntimeConfigParser()

export default class Deploy extends Command {
  static description = 'Deploys a chainlink smart contract.'

  static examples = [
    'belt deploy [<options>] <version/contract> [<args>]',
    "belt deploy v0.6/AccessControlledAggregator '0x01be23585060835e02b77ef475b0cc51aa1e0709' 160000000000000000 300 1 1000000000 18 'LINK/USD'",
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
  ]

  async run() {
    const { args, argv } = this.parse(Deploy)

    await this.deployContract(args.versionedContractName, argv)
  }

  private async deployContract(versionedContractName: string, argv: string[]) {
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

    // Validate command inputs against constructor inputs
    const constructorABI = getConstructorABI(abi)
    const numConstructorInputs = constructorABI['inputs'].length
    const commandInputs = argv.slice(Object.keys(Deploy.args).length)
    if (numConstructorInputs !== commandInputs.length) {
      this.error(
        chalk.red(
          `Received ${commandInputs.length} arguments, constructor expected ${numConstructorInputs}`,
        ),
      )
    }

    // Transforms string arrays to arrays
    const parsedInputs = parseArrayInputs(commandInputs)

    // Initialize ethers wallet (signer + provider)
    const wallet = initSigner(config)

    // Intialize ethers contract factory
    const factory = new ethers.ContractFactory(
      abi['compilerOutput']['abi'],
      abi['compilerOutput']['evm']['bytecode'],
      wallet,
    )

    // Load transaction overrides
    // TODO: pick up for flags with priority
    // TODO: 'nonce'
    // TODO: 'value'
    const gasPrice = config.gasPrice
    const gasLimit = config.gasLimit

    // Deploy contract
    let contract: ethers.Contract
    try {
      // TODO: add overrides e.g. gasprice, gaslimit
      contract = await factory.deploy(...parsedInputs, {
        gasPrice,
        gasLimit,
      })
      cli.action.start(
        `Deploying ${versionedContractName} to ${contract.address} `,
      )
      const receipt = await contract.deployTransaction.wait() // defaults to 1 confirmation
      cli.action.stop(`Deployed in tx ${receipt.transactionHash}`)
      this.log(contract.address)
    } catch (e) {
      this.error(chalk.red(e))
    }
    return
  }
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

function getConstructorABI(abi: any) {
  const constructorABI = abi['compilerOutput']['abi'].find(
    (i: { type: string }) => {
      return i.type === 'constructor'
    },
  )
  return constructorABI
}
