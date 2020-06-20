/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import cli from 'cli-ux'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { RuntimeConfigParser, RuntimeConfig } from '../services/runtimeConfig'
import { getNetworkName, findABI } from '../services/utils'

const conf = new RuntimeConfigParser()

export default class Deploy extends Command {
  static description = 'Deploys a chainlink smart contract'

  static examples = [
    'belt deploy [<options>] <contractName> [<args>]',
    "belt deploy AccessControlledAggregator '0x01be23585060835e02b77ef475b0cc51aa1e0709' 160000000000000000 300 1 1000000000 18 'LINK/USD'",
  ]
  static strict = false

  static flags = {
    help: flags.help({ char: 'h' }),
    // TODO: Add override flags for gas price, gas limit, nonce
  }

  static args: Parser.args.IArg[] = [
    {
      name: 'contractName',
      description: 'Name of the chainlink contract to deploy',
    },
  ]

  async run() {
    const { args, argv } = this.parse(Deploy)

    await this.deployContract(args.contractName, argv)
  }

  private async deployContract(contractName: string, argv: string[]) {
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

    // Validate constructor inputs and user input length
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

    // Initialize ethers wallet (signer + provider)
    const wallet = initWallet(config)

    // Intialize ethers contract factory
    const factory = new ethers.ContractFactory(
      abi['compilerOutput']['abi'],
      abi['compilerOutput']['evm']['bytecode'],
      wallet,
    )

    // Deploy contract
    let contract
    try {
      // TODO: add overrides e.g. gasprice, gaslimit
      contract = await factory.deploy(...commandInputs, {})
      cli.action.start(`Deploying ${contractName} to ${contract.address} `)
      contract.deployTransaction.wait()
      cli.action.stop('Deployed')
      this.log(contract.address)
    } catch (e) {
      this.error(e)
    }
    return
  }
}

function initWallet(config: RuntimeConfig): ethers.Wallet {
  const provider = new ethers.providers.InfuraProvider(
    getNetworkName(config.chainId),
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
