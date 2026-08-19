import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const skills = join(dirname(fileURLToPath(import.meta.url)), "skills")

export default {
  id: "cursor.docs-canvas",
  setup: async (ctx) => {
    if (typeof ctx.skill?.transform !== "function") return
    await ctx.skill.transform((draft) => {
      if (typeof draft.source === "function") draft.source(skills)
    })
  },
}
