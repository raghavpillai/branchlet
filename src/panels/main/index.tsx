import { SelectPrompt } from "../../components/common/index.js"
import { MESSAGES } from "../../constants/index.js"
import type { AppMode, SelectOption } from "../../types/index.js"

interface MainPanelProps {
  onSelect: (value: AppMode | "exit", selectedIndex?: number) => void
  onCancel: () => void
  defaultIndex?: number
}

export function MainPanel({ onSelect, onCancel, defaultIndex = 0 }: MainPanelProps) {
  const getMenuOptions = (): SelectOption<AppMode | "exit">[] => [
    {
      label: MESSAGES.MENU_CREATE,
      value: "create",
    },
    {
      label: MESSAGES.MENU_LIST,
      value: "list",
    },
    {
      label: MESSAGES.MENU_DELETE,
      value: "delete",
    },
    {
      label: MESSAGES.MENU_SETTINGS,
      value: "settings",
    },
    {
      label: MESSAGES.MENU_EXIT,
      value: "exit",
    },
  ]

  return (
    <SelectPrompt
      label={MESSAGES.MENU_TITLE}
      options={getMenuOptions()}
      onSelect={onSelect}
      onCancel={onCancel}
      defaultIndex={defaultIndex}
    />
  )
}
