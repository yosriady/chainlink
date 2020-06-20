/* eslint-disable @typescript-eslint/no-use-before-define */
import fs from 'fs'
import { join } from 'path'
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import cli from 'cli-ux'
import chalk from 'chalk'
import { ethers } from 'ethers'
import { RuntimeConfigParser } from '../services/runtimeConfig'
import { getNetworkName } from '../services/utils'

// const ETHERS_ARTIFACTS_DIR = 'ethers'
const conf = new RuntimeConfigParser()

export default class Deploy extends Command {
  static description = 'Deploys a chainlink smart contract'

  static examples = ['belt deploy [<options>] <contractName> [<args>]']
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
    if (!conf.exists()) {
      this.log(
        chalk.red(".beltrc not found - Run 'belt init -i' to get started."),
      )
      this.exit(1)
    }

    const options = conf.load()
    const cwd = process.cwd()
    const artifactPath = join(cwd, options.artifactsDir, `${contractName}.json`)
    if (!fs.existsSync(artifactPath)) {
      this.log(chalk.red(`ABI not found at ${artifactPath}`))
      this.exit(1)
    }

    // Load contract ABI
    const buffer = fs.readFileSync(artifactPath)
    const abi = JSON.parse(buffer.toString())

    // Initialize ethers wallet
    const provider = new ethers.providers.InfuraProvider(
      getNetworkName(options.chainId),
    )
    let wallet = ethers.Wallet.fromMnemonic(options.mnemonic)
    wallet = wallet.connect(provider)

    // Intialize ethers contract factory
    const factory = new ethers.ContractFactory(
      abi['compilerOutput']['abi'],
      abi['compilerOutput']['evm']['bytecode'],
      wallet,
    )

    // TODO: parse ABI for object of "type": "constructor"
    const constructorInputs = argv.slice(1)
    // TODO: validate number of parameters

    const contract = await factory.deploy(constructorInputs)
    cli.action.start(`Deploying ${contractName} to ${contract.address}`)

    contract.deployTransaction.wait()

    cli.action.stop('Deployed')
    this.log(contract.address)
  }
}
