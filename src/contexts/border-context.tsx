import { createContext, useContext } from "react"

interface BorderContextType {
  setBorderColor: (color: string) => void
}

export const BorderContext = createContext<BorderContextType | null>(null)

export function useBorderColor() {
  return useContext(BorderContext)
}