import { exit } from 'node:process'
import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * @typedef {import('node:child_process').ChildProcess} ChildProcess
 * @typedef {import('node:child_process').Serializable} Serializable
 * @typedef {import('node:child_process').SendHandle} SendHandle
 */

export default class Fork {
  /** @type {ChildProcess} */
  #child

  /** @type {(message: Serializable, sendHandle: SendHandle) => void} */
  #cb = () => {}

  #init = () => {
    this.#child = fork(this.url)
    this.#child.on('message', this.#cb)
    this.#child.on('error', console.error)
    this.#child.on('close', code => {
      if (code !== 0) return this.#init()
      exit(1)
    })
  }

  /**
   * @param {Serializable} message
   * @param {(error: Error | null) => void} [callback]
   * @returns {boolean}
   */
  send = (message, callback) => {
    if (!this.#child.connected) return false
    return this.#child.send(message, callback)
  }

  /**
   * @param {(message: Serializable, sendHandle: SendHandle) => void} cb
   */
  set onmsg(cb) {
    this.#child.off('message', this.#cb)
    this.#cb = cb
    this.#child.on('message', this.#cb)
  }

  /**
   * @param {URL} url
   */
  constructor(url) {
    this.url = fileURLToPath(url)
    this.#init()
  }
}
