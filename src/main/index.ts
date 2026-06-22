import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function bundledActivityCli(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'activity-cms-psd-node', 'activity-cms-psd-node')
  }
  return path.join(__dirname, '../../vendor/activity-cms-psd-node/activity-cms-psd-node')
}

const activityCli = process.env.ACTIVITY_CMS_PSD_NODE_CLI || bundledActivityCli()
const defaultOutputRoot =
  process.env.ACTIVITY_CMS_PSD_OUT_DIR || path.join(os.homedir(), 'Documents', 'activity-cms-output')

let mainWindow: BrowserWindow | null = null
let currentJob: ChildProcessWithoutNullStreams | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1080,
    minHeight: 640,
    title: 'PSD 转 CMS 导入包',
    backgroundColor: '#f5f3ee',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function send(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload)
}

function focusWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function runCommand(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      env: {
        ...process.env,
        ...(options.env || {})
      }
    })
    currentJob = child
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      send('job-log', { stream: 'stdout', text })
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      send('job-log', { stream: 'stderr', text })
    })
    child.on('error', (error) => {
      currentJob = null
      reject(error)
    })
    child.on('close', (code) => {
      currentJob = null
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(`${path.basename(command)} 退出码 ${code}\n${stderr || stdout}`))
    })
  })
}

function parseActivityResult(stdout: string): Record<string, string> {
  const jsonStart = stdout.indexOf('{')
  if (jsonStart < 0) {
    throw new Error(`activity-cms-psd-node 未输出 JSON：${stdout.slice(0, 500)}`)
  }
  return JSON.parse(stdout.slice(jsonStart))
}

async function zipDirectory(packageDir: string): Promise<string> {
  const zipPath = path.join(path.dirname(packageDir), `${path.basename(packageDir)}.zip`)
  await fs.promises.rm(zipPath, { force: true })
  await runCommand('zip', ['-qr', zipPath, '.'], { cwd: packageDir })
  return zipPath
}

async function validatePsd(psdPath: string): Promise<fs.Stats> {
  const stat = await fs.promises.stat(psdPath)
  if (!stat.isFile()) throw new Error('请选择一个 PSD 文件')
  if (!psdPath.toLowerCase().endsWith('.psd')) throw new Error('文件扩展名必须是 .psd')
  return stat
}

ipcMain.handle('choose-psd', async () => {
  focusWindow()
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择 PSD 文件',
    properties: ['openFile'],
    filters: [{ name: 'Photoshop PSD', extensions: ['psd'] }]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('choose-output', async () => {
  focusWindow()
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择输出目录',
    defaultPath: defaultOutputRoot,
    properties: ['openDirectory', 'createDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('get-defaults', async () => ({
  activityCli,
  outputRoot: defaultOutputRoot
}))

ipcMain.handle('open-path', async (_event, targetPath?: string) => {
  if (!targetPath) return
  await shell.openPath(targetPath)
})

ipcMain.handle('show-in-folder', async (_event, targetPath?: string) => {
  if (!targetPath) return
  shell.showItemInFolder(targetPath)
})

ipcMain.handle('cancel-job', async () => {
  if (!currentJob) return false
  currentJob.kill('SIGTERM')
  return true
})

ipcMain.handle('start-conversion', async (_event, payload: { psdPath: string; outputRoot?: string; debug?: boolean }) => {
  if (currentJob) throw new Error('已有任务正在处理，请等它完成或先取消')

  const psdPath = path.resolve(payload.psdPath)
  const outputRoot = path.resolve(payload.outputRoot || defaultOutputRoot)
  const debug = Boolean(payload.debug)
  const stat = await validatePsd(psdPath)
  await fs.promises.mkdir(outputRoot, { recursive: true })

  send('job-status', {
    state: 'running',
    psdPath,
    outputRoot,
    size: stat.size,
    startedAt: Date.now()
  })
  send('job-log', {
    stream: 'system',
    text: `开始处理：${psdPath}\n输出目录：${outputRoot}\n转换引擎：activity-cms-psd-node\n`
  })

  try {
    const args = [psdPath, '--out', outputRoot]
    if (debug) args.push('--debug')
    const { stdout } = await runCommand(activityCli, args, {
      cwd: path.dirname(activityCli),
      env: {
        ACTIVITY_CMS_PSD_TINIFY_KEY: process.env.ACTIVITY_CMS_PSD_TINIFY_KEY || process.env.TINIFY_API_KEY || ''
      }
    })
    const result = parseActivityResult(stdout)
    const packageDir = result.packageDir
    if (!packageDir) throw new Error('转换完成但未返回 packageDir')

    send('job-log', { stream: 'system', text: `生成目录：${packageDir}\n开始压缩结果包...\n` })
    const zipPath = await zipDirectory(packageDir)
    const zipStat = await fs.promises.stat(zipPath)
    const summary = {
      state: 'done',
      packageDir,
      zipPath,
      zipSize: zipStat.size,
      jsonPath: path.join(packageDir, 'cms-page-config.json'),
      assetDir: path.join(packageDir, 'assets'),
      finishedAt: Date.now()
    }
    send('job-status', summary)
    return summary
  } catch (error) {
    const failure = {
      state: 'failed',
      message: error instanceof Error ? error.message : String(error),
      finishedAt: Date.now()
    }
    send('job-status', failure)
    throw error
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
