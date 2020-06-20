/* eslint-disable @typescript-eslint/no-use-before-define */
import { Command, flags } from '@oclif/command'
import * as Parser from '@oclif/parser'
import * as cli from 'inquirer'
import chalk from 'chalk'
import {
  RuntimeConfig,
  RuntimeConfigParser as Config,
} from '../services/runtimeConfig'

const NETWORKS = ['mainnet', 'rinkeby', 'kovan']
const DEFAULTS: RuntimeConfig = {
  network: '',
  mnemonic: '',
  infuraProjectId: '',
}

export default class Init extends Command {
  static description = 'Initialize .beltrc file'

  static examples = [
    'belt init -i',
    "belt box --network rinkeby --mnemonic 'raise clutch area ...' --infuraProjectId fdf38d... test-dir/",
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    interactive: flags.boolean({
      char: 'i',
      description: 'run this command in interactive mode',
    }),
    network: flags.string({
      char: 'n',
      description:
        'Ethereum network to send transactions to e.g. mainnet, rinkeby',
    }),
    mnemonic: flags.string({
      char: 'm',
      description: 'Mnemonic for Ethereum wallet to send transactions from',
    }),
    infuraProjectId: flags.string({
      char: 'p',
      description: 'Infura project ID',
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

    if (flags.interactive) {
      return await this.handleInteractive(args.path)
    } else {
      return this.handleNonInteractive(
        flags.network,
        flags.mnemonic,
        flags.infuraProjectId,
        args.path,
      )
    }
  }

  private async handleInteractive(path: string) {
    let defaults = DEFAULTS
    const conf = new Config(path)

    if (conf.exists()) {
      this.log(chalk.greenBright('.beltrc found, loading values'))
      defaults = conf.get()
    }

    const { network, mnemonic, infuraProjectId } = await cli.prompt([
      {
        name: 'network',
        type: 'list',
        choices: NETWORKS,
        message: 'Which network do you want to make transactions on?',
        default: defaults.network,
      },
      {
        name: 'mnemonic',
        type: 'input',
        message: 'Enter 12-word mnemonic:',
        default: defaults.mnemonic,
      },
      {
        name: 'infuraProjectId',
        type: 'input',
        message: 'Enter infuraProjectId:',
        default: defaults.infuraProjectId,
      },
    ])

    const config: RuntimeConfig = {
      network,
      mnemonic,
      infuraProjectId,
    }
    conf.set(config)
    this.log(chalk.greenBright(`.beltrc initialized in ${conf.filepath()}`))
  }

  private handleNonInteractive(
    network: string | undefined,
    mnemonic: string | undefined,
    infuraProjectId: string | undefined,
    path: string,
  ) {
    let defaults = DEFAULTS
    const conf = new Config(path)
    if (conf.exists()) {
      this.log(chalk.greenBright('.beltrc found, loading values'))
      defaults = conf.get()
    }

    const config = {
      network: network || defaults.network,
      mnemonic: mnemonic || defaults.mnemonic,
      infuraProjectId: infuraProjectId || defaults.infuraProjectId,
    }
    conf.set(config)
    this.log(chalk.greenBright(`.beltrc initialized in ${conf.filepath()}`))
  }
}
