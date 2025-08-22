import { createContext, useContext } from "react"

interface BorderContextType {
  setBorderColor: (color: string) => void
}

export const BorderContext = createContext<BorderContextType | null>(null)

export function useBorderContext() {
  return useContext(BorderContext)
}
