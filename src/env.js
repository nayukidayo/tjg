import { env } from 'node:process'

export const API_PORT = Number(env.API_PORT) || 54327

export const GPS_PORT = Number(env.GPS_PORT) || 54328
export const GPS_DELAY = Number(env.GPS_DELAY) || 100

export const RFID_PORT = Number(env.RFID_PORT) || 54329
export const RFID_DELAY = Number(env.RFID_DELAY) || 100

export const MERGE_DELAY = Number(env.MERGE_DELAY) || 5000 / 2

export const RETAIN = Number(env.RETAIN) || 30
