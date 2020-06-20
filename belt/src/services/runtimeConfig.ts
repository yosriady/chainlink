import fs from 'fs'
import { join } from 'path'

// Runtime configuration for belt deploy and belt exec
export interface RuntimeConfig {
  network: string
  mnemonic: string
  infuraProjectId: string
}

const RUNTIME_CONFIG = '.beltrc'

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
