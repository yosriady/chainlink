import d from 'debug'
import { readFileSync } from 'fs'
import { ls } from 'shelljs'
import * as config from './config'

/**
 * Get contract versions and their directories
 */
export function getContractDirs(conf: config.App) {
  const contractDirs = ls(conf.contractsDir)

  return contractDirs.map(d => ({
    dir: d,
    version: conf.compilerSettings.versions[d],
  }))
}

/**
 * Get artifact verions and their directories
 */
export function getArtifactDirs(conf: config.App) {
  const artifactDirs = ls(conf.artifactsDir)

  return artifactDirs.map(d => ({
    dir: d,
    version: conf.compilerSettings.versions[d],
  }))
}

/**
 * Create a logger specifically for debugging. The root level namespace is based on the package name.
 *
 * @see https://www.npmjs.com/package/debug
 * @param fileName The filename that the debug logger is being used in for namespacing purposes.
 */
export function debug(fileName: string) {
  return d('belt').extend(fileName)
}

/**
 * Load a json file at the specified path.
 *
 * @param path The file path relative to the cwd to read in the json file from.
 */
export function getJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/**
 * Get the network name for a given chainId
 *
 * @param chainId Ethereum chain ID
 */
export function getNetworkName(chainId: number): string {
  const networks: { [keyof: number]: string } = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    42: 'kovan',
  }
  if (!Object.keys(networks).includes(chainId.toString())) {
    throw new Error('Invalid chain Id')
  }

  return networks[chainId]
}
