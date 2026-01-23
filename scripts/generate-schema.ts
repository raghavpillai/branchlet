import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"
import { WorktreeConfigSchema } from "../src/schemas/config-schema.js"

const jsonSchema = z.toJSONSchema(WorktreeConfigSchema, { target: "draft-7" })

const schemaWithMeta = {
  ...jsonSchema,
  $schema: "http://json-schema.org/draft-7/schema#",
  $id: "https://raw.githubusercontent.com/raghavpillai/branchlet/main/schema.json",
  title: "Branchlet Configuration",
  description: "Configuration schema for Branchlet - Git worktree management CLI",
}

const outputPath = path.join(import.meta.dirname, "..", "schema.json")
fs.writeFileSync(outputPath, JSON.stringify(schemaWithMeta, null, 2) + "\n")
console.log(`Generated JSON Schema at: ${outputPath}`)
