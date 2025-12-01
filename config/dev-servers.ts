import path from "path"

export interface DevServerConfig {
  id: string
  name: string
  cwd: string
  port: number
  startCommand: string
  description?: string
}

const DEV_ROOT = process.env.DEV_ROOT || path.join(process.env.HOME || "/Users/jsy", "dev")

export const devServers: DevServerConfig[] = [
  {
    id: "2ndmarket",
    name: "2ndMarket",
    cwd: path.join(DEV_ROOT, "2ndmarket"),
    port: 3001,
    startCommand: "npm run dev -- --port 3001",
    description: "2ndMarket Next.js dev server",
  },
  {
    id: "imoji-battle-field",
    name: "Imoji Battle Field",
    cwd: path.join(DEV_ROOT, "imoji-battle-field", "battle-animals-game"),
    port: 3002,
    startCommand: "npm run dev -- --port 3002",
    description: "Imoji battle field playground",
  },
  {
    id: "incomplete",
    name: "Incomplete Projects",
    cwd: path.join(DEV_ROOT, "IncompleteProj"),
    port: 3003,
    startCommand: "npm run dev -- --port 3003",
    description: "Incomplete Projects discovery platform",
  },
  {
    id: "kls-connect",
    name: "KLS Connect",
    cwd: path.join(DEV_ROOT, "kls-connect"),
    port: 3004,
    startCommand: "npm run dev -- --port 3004",
    description: "KLS Connect portal",
  },
]
