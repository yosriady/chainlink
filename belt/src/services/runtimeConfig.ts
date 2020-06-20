import fs from 'fs'
import { join } from 'path'

// Runtime configuration for belt deploy and belt exec
export interface RuntimeConfig {
  chainId: number
  mnemonic: string
  infuraProjectId: string
  gasPrice: number
  gasLimit: number
  artifactsDir: string
}

const RUNTIME_CONFIG = '.beltrc'
const DEFAULTS: RuntimeConfig = {
  chainId: 4,
  mnemonic: '',
  infuraProjectId: '',
  gasPrice: 40000000000, // 40 gwei
  gasLimit: 8000000,
  artifactsDir: 'ethers/v0.6',
}

/**
 * Helper for reading from and writing RuntimeConfig to .beltrc
 */
export class RuntimeConfigParser {
  path: string

  constructor(path: string) {
    this.path = path
  }

  exists(): boolean {
    return fs.existsSync(this.filepath())
  }

  filepath(): string {
    return join(this.path, RUNTIME_CONFIG)
  }

  get(): RuntimeConfig {
    let result = DEFAULTS
    if (this.exists()) {
      result = this.load()
    }
    return result
  }

  load(): RuntimeConfig {
    let result
    try {
      const buffer = fs.readFileSync(this.filepath(), 'utf8')
      result = JSON.parse(buffer.toString())
    } catch (e) {
      throw Error(`Could not load .beltrc at ${this.path}`)
    }
    return result
  }

  set(config: RuntimeConfig) {
    // TODO: validate config
    // assert(config.network);
    // assert(config.mnemonic);
    // assert(config.infuraProjectId);

    fs.writeFileSync(this.filepath(), JSON.stringify(config, null, 4))
  }
}
