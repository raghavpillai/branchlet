export interface CliArgs {
  command: "create" | "list" | "delete"
  name?: string
  source?: string
  branch?: string
  path?: string
  json?: boolean
  force?: boolean
}
