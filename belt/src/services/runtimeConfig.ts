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
    return fs.existsSync(join(this.path, RUNTIME_CONFIG))
  }

  filepath(): string {
    return join(this.path, RUNTIME_CONFIG)
  }

  get(): RuntimeConfig {
    const buffer = fs.readFileSync(join(this.path, RUNTIME_CONFIG), 'utf8')
    const result = JSON.parse(buffer.toString())
    return result
  }

  set(config: RuntimeConfig) {
    // TODO: validate config
    // assert(config.network);
    // assert(config.mnemonic);
    // assert(config.infuraProjectId);

    fs.writeFileSync(
      join(this.path, RUNTIME_CONFIG),
      JSON.stringify(config, null, 4),
    )
  }
}
