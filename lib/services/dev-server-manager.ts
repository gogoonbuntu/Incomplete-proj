import { exec } from "child_process"
import { spawn } from "child_process"
import util from "util"

import type { DevServerConfig } from "@/config/dev-servers"
import { devServers } from "@/config/dev-servers"

const execAsync = util.promisify(exec)

export interface ServerStatus extends DevServerConfig {
  running: boolean
  pid?: string
  lastRestart?: string
}

async function getServerStatus(server: DevServerConfig): Promise<ServerStatus> {
  try {
    const { stdout } = await execAsync(`lsof -ti :${server.port} -sTCP:LISTEN`)
    const pid = stdout.trim().split("\n").filter(Boolean)[0]
    return {
      ...server,
      running: Boolean(pid),
      pid,
    }
  } catch (error) {
    return {
      ...server,
      running: false,
    }
  }
}

export async function listServerStatuses(): Promise<ServerStatus[]> {
  return Promise.all(devServers.map((server) => getServerStatus(server)))
}

async function stopServer(server: DevServerConfig) {
  try {
    await execAsync(
      `PIDS=$(lsof -ti :${server.port}); if [ -n "$PIDS" ]; then kill -9 $PIDS; fi`,
    )
  } catch (error) {
    // ignore if no process running
  }
}

async function startServer(server: DevServerConfig) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(server.startCommand, {
      cwd: server.cwd,
      env: process.env,
      shell: true,
      detached: true,
      stdio: "ignore",
    })

    child.on("error", reject)

    child.unref()
    resolve()
  })
}

async function waitForServer(server: DevServerConfig, retries = 10, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const status = await getServerStatus(server)
    if (status.running) {
      return status
    }
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  return {
    ...server,
    running: false,
  }
}

export async function restartServerById(serverId: string): Promise<ServerStatus> {
  const server = devServers.find((item) => item.id === serverId)
  if (!server) {
    throw new Error(`Server with id ${serverId} not found`)
  }

  await stopServer(server)
  await new Promise((resolve) => setTimeout(resolve, 500))
  await startServer(server)
  return waitForServer(server)
}
