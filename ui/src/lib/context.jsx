import { createContext, useContext, useState } from 'react'

const DeviceContext = createContext()

export function DeviceProvider({ children }) {
  const [device, setDevice] = useState()
  return <DeviceContext.Provider value={{ device, setDevice }}>{children}</DeviceContext.Provider>
}

export function useDeviceContext() {
  const context = useContext(DeviceContext)
  if (typeof context === 'undefined') throw new Error('DeviceProvider')
  return context
}
