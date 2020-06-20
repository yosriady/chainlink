/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import * as cli from 'inquirer'
import chalk from 'chalk'
import { RuntimeConfig, RuntimeConfigParser } from '../services/runtimeConfig'

const NETWORKS = [
  { value: 1, name: 'mainnet' },
  { value: 3, name: 'ropsten' },
  { value: 4, name: 'rinkeby' },
  { value: 42, name: 'kovan' },
]

export default class Init extends Command {
  static description =
    'Initializes a .beltrc file. Required for `deploy`, `exec` and `call`.'

  static examples = [
    'belt init',
    "belt init --chainId 4 --mnemonic 'raise clutch area ...' --infuraProjectId fdf38d... my-project/",
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    chainId: flags.integer({
      char: 'c',
      description:
        'Ethereum network to send transactions to e.g. mainnet (1), rinkeby (4)',
    }),
    mnemonic: flags.string({
      char: 'm',
      description: 'Mnemonic for Ethereum wallet to send transactions from',
    }),
    infuraProjectId: flags.string({
      char: 'p',
      description: 'Infura project ID',
    }),
    gasPrice: flags.integer({
      char: 'g',
      description: 'Default gas price',
    }),
    gasLimit: flags.integer({
      char: 'l',
      description: 'Default gas limit',
    }),
    artifactsDir: flags.string({
      char: 'a',
      description: 'ABI directory',
    }),
  }

  static args: Parser.args.IArg[] = [
    {
      name: 'path',
      description: '.beltrc filepath',
      default: '.',
    },
  ]

  async run() {
    const { flags, args } = this.parse(Init)
    this.log('Initializing .beltrc')

    const noFlags = Object.keys(flags).length === 0
    if (noFlags) {
      return await this.handleInteractive(args.path)
    } else {
      return this.handleNonInteractive(
        args.path,
        flags.chainId,
        flags.mnemonic,
        flags.infuraProjectId,
        flags.gasPrice,
        flags.gasLimit,
        flags.artifactsDir,
      )
    }
  }

  private async handleInteractive(path: string) {
    const conf = new RuntimeConfigParser(path)
    const current = conf.get()

    const {
      chainId,
      mnemonic,
      infuraProjectId,
      gasPrice,
      gasLimit,
      artifactsDir,
    } = await cli.prompt([
      {
        name: 'chainId',
        type: 'list',
        choices: NETWORKS,
        message: 'Enter default network:',
        default: current.chainId,
      },
      {
        name: 'mnemonic',
        type: 'input',
        message: 'Enter 12-word mnemonic:',
        default: current.mnemonic,
      },
      {
        name: 'infuraProjectId',
        type: 'input',
        message: 'Enter infuraProjectId:',
        default: current.infuraProjectId,
      },
      {
        name: 'gasPrice',
        type: 'input',
        message: 'Enter default gasPrice:',
        default: current.gasPrice,
      },
      {
        name: 'gasLimit',
        type: 'input',
        message: 'Enter default gasLimit:',
        default: current.gasLimit,
      },
      {
        name: 'artifactsDir',
        type: 'input',
        message: 'Enter artifactsDir:',
        default: current.artifactsDir,
      },
    ])

    const config: RuntimeConfig = {
      chainId,
      mnemonic,
      infuraProjectId,
      gasPrice,
      gasLimit,
      artifactsDir,
    }
    conf.set(config)
    this.log(chalk.greenBright(`.beltrc saved in ${conf.filepath()}`))
  }

  private handleNonInteractive(
    path: string,
    chainId?: number,
    mnemonic?: string,
    infuraProjectId?: string,
    gasPrice?: number,
    gasLimit?: number,
    artifactsDir?: string,
  ) {
    const conf = new RuntimeConfigParser(path)
    const current = conf.get()

    const config = {
      chainId: chainId || current.chainId,
      mnemonic: mnemonic || current.mnemonic,
      infuraProjectId: infuraProjectId || current.infuraProjectId,
      gasPrice: gasPrice || current.gasPrice,
      gasLimit: gasLimit || current.gasLimit,
      artifactsDir: artifactsDir || current.artifactsDir,
    }
    conf.set(config)
    this.log(chalk.greenBright(`.beltrc saved in ${conf.filepath()}`))
  }
}
