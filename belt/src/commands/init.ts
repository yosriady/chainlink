import fs from 'fs'
import { Command, flags } from '@oclif/command'
import * as cli from 'inquirer'
import chalk from 'chalk'

const RUNTIME_CONFIG = '.beltrc'
const NETWORKS = ['mainnet', 'rinkeby', 'kovan']
const DEFAULTS: RuntimeConfig = {
  network: '',
  mnemonic: '',
  infuraProjectId: '',
}

export interface RuntimeConfig {
  network: string
  mnemonic: string
  infuraProjectId: string
}

export default class Init extends Command {
  static description = 'Initialize .beltrc file'

  static examples = [
    'belt init -i',
    'belt box --network rinkeby --mnemonic <...> --infuraProjectId <...>',
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

  async run() {
    const { flags } = this.parse(Init)
    this.log('Initializing .beltrc')

    if (flags.interactive) {
      return await this.handleInteractive()
    } else {
      return this.handleNonInteractive(
        flags.network,
        flags.mnemonic,
        flags.infuraProjectId,
      )
    }
  }

  private async handleInteractive() {
    let defaults = DEFAULTS
    if (runtimeConfigExists()) {
      this.log(chalk.greenBright('.beltrc already exists'))
      defaults = getRuntimeConfig()
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

    const config = {
      network,
      mnemonic,
      infuraProjectId,
    }
    setRuntimeConfig(config)
    this.log(chalk.greenBright('.beltrc initialized in current directory'))
  }

  private handleNonInteractive(
    network: string | undefined,
    mnemonic: string | undefined,
    infuraProjectId: string | undefined,
  ) {
    let defaults = DEFAULTS
    if (runtimeConfigExists()) {
      this.log(chalk.greenBright('.beltrc already exists, updating values'))
      defaults = getRuntimeConfig()
    }

    const config = {
      network: network || defaults.network,
      mnemonic: mnemonic || defaults.mnemonic,
      infuraProjectId: infuraProjectId || defaults.infuraProjectId,
    }
    setRuntimeConfig(config)
    this.log(chalk.greenBright('.beltrc initialized in current directory'))
  }
}

function runtimeConfigExists(): boolean {
  return fs.existsSync(RUNTIME_CONFIG)
}

function getRuntimeConfig(): RuntimeConfig {
  const buffer = fs.readFileSync(RUNTIME_CONFIG)
  const result = JSON.parse(buffer.toString())
  return result
}

function setRuntimeConfig(config: RuntimeConfig) {
  fs.writeFileSync(RUNTIME_CONFIG, JSON.stringify(config, null, 4))
}