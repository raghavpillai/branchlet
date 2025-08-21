import type React from "react"

export type AppMode = "menu" | "create" | "list" | "delete" | "settings"

export interface SelectOption<T = string> {
  label: string
  value: T
  description?: string
  isDefault?: boolean
}

export interface InputPromptProps {
  label: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | undefined
  onSubmit: (value: string) => void
  onCancel?: () => void
}

export interface SelectPromptProps<T = string> {
  label: string
  options: SelectOption<T>[]
  onSelect: (value: T, selectedIndex?: number) => void
  onCancel?: () => void
  defaultIndex?: number
}

export interface ConfirmDialogProps {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: "default" | "warning" | "danger"
}

export interface StatusIndicatorProps {
  status: "loading" | "success" | "error" | "info"
  message: string
  spinner?: boolean
}

export interface CreateWorktreeState {
  step: "directory" | "source-branch" | "new-branch" | "confirm" | "creating" | "success"
  directoryName: string
  sourceBranch: string
  newBranch: string
  error?: string
}

export interface DeleteWorktreeState {
  step: "select" | "confirm" | "deleting" | "success"
  selectedWorktree?: string
  force: boolean
  error?: string
}
