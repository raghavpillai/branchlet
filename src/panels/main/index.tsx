import { SelectPrompt } from "../../components/common/index.js"
import { COLORS, MESSAGES } from "../../constants/index.js"
import type { ShellIntegrationStatus } from "../../services/shell-integration-service.js"
import type { AppMode, SelectOption } from "../../types/index.js"

interface MainPanelProps {
  onSelect: (value: AppMode | "exit", selectedIndex?: number) => void
  onCancel: () => void
  defaultIndex?: number
  shellIntegrationStatus: ShellIntegrationStatus | null
}

export function MainPanel({
  onSelect,
  onCancel,
  defaultIndex = 0,
  shellIntegrationStatus,
}: MainPanelProps) {
  const getMenuOptions = (): SelectOption<AppMode | "exit">[] => {
    const options: SelectOption<AppMode | "exit">[] = []

    if (shellIntegrationStatus && !shellIntegrationStatus.isInstalled) {
      options.push({
        label: MESSAGES.MENU_SETUP,
        value: "setup",
        color: COLORS.WARNING,
        description: "recommended",
      })
    }

    options.push(
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
      }
    )

    return options
  }

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
