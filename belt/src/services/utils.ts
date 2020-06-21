import fs from 'fs'
import { join } from 'path'
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
 * Returns the network name for a given chainId.
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
  const idNotFound = !Object.keys(networks).includes(chainId.toString())
  if (idNotFound) {
    throw new Error('Invalid chain Id')
  }

  return networks[chainId]
}

/**
 * Finds and loads the ABI of a chainlink smart contract.
 *
 * @param config .beltrc RuntimeConfig
 * @param versionedContractName e.g. 'v0.6/AccessControlledAggregator'
 */
export function findABI(
  versionedContractName: string,
): { found: boolean; abi: any } {
  const cwd = process.cwd()
  const artifactPath = join(cwd, 'abi', `${versionedContractName}.json`)

  const found = fs.existsSync(artifactPath)
  if (!found) return { found, abi: null }

  const buffer = fs.readFileSync(artifactPath)
  const abi = JSON.parse(buffer.toString())
  return { found, abi }
}

// Converts array strings e.g. '[0xe47D8b2CC42F07cdf05ca791bab47bc47Ed8B5CD]' to actual JS arrays
export function parseArrayInputs(commandInputs: string[]) {
  const parsedInputs = commandInputs.map((i: string) => {
    const isArrayString = i.charAt(0) === '[' && i.charAt(i.length - 1) === ']'
    if (isArrayString) {
      console.log(`${i} is array string`)
      const trimmed = i.slice(1, -1)
      const arr = trimmed.split(',')
      return arr
    }
    return i
  })
  return parsedInputs
}
