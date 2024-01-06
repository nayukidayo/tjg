import process from 'node:process'
import { Console } from 'node:console'

/**
 * @typedef {"debug"|"info"|"warn"|"error"|"fatal"|"silent"} Level
 */

class Logger {
  #level
  #color
  #console

  #dict = {
    debug: 5,
    info: 4,
    warn: 3,
    error: 2,
    fatal: 1,
    silent: -1,
  }

  /**
   * @param {{level?:Level,color?:boolean|"auto"}} [opt]
   */
  constructor(opt = {}) {
    const { level = 'info', color = 'auto' } = opt
    this.#level = this.#dict[level] ?? 4
    this.#color = color
    this.#init()
  }

  #init = () => {
    this.#console = new Console({
      colorMode: this.#color,
      stdout: process.stdout,
      stderr: process.stderr,
    })
  }

  debug = (...args) => {
    if (this.#level > 4) {
      this.#console.trace('[DEBUG]', ...args)
    }
  }

  info = (...args) => {
    if (this.#level > 3) {
      this.#console.log('[INFO]', ...args)
    }
  }

  warn = (...args) => {
    if (this.#level > 2) {
      this.#console.error('[WARN]', ...args)
    }
  }

  error = (...args) => {
    if (this.#level > 1) {
      this.#console.error('[ERROR]', ...args)
    }
  }

  fatal = (...args) => {
    if (this.#level > 0) {
      this.#console.error('[FATAL]', ...args)
      process.exit(1)
    }
  }
}

export default Logger
