import { contextBridge, ipcRenderer, webUtils } from 'electron'

const api = {
  choosePsd: () => ipcRenderer.invoke('choose-psd') as Promise<string | null>,
  chooseOutput: () => ipcRenderer.invoke('choose-output') as Promise<string | null>,
  getDefaults: () => ipcRenderer.invoke('get-defaults') as Promise<{ activityCli: string; outputRoot: string }>,
  getPathForFile: (file: File & { path?: string }) => {
    if (webUtils && typeof webUtils.getPathForFile === 'function') return webUtils.getPathForFile(file)
    return file?.path || ''
  },
  startConversion: (payload: { psdPath: string; outputRoot: string; debug: boolean }) =>
    ipcRenderer.invoke('start-conversion', payload) as Promise<JobDoneStatus>,
  cancelJob: () => ipcRenderer.invoke('cancel-job') as Promise<boolean>,
  openPath: (targetPath?: string) => ipcRenderer.invoke('open-path', targetPath),
  showInFolder: (targetPath?: string) => ipcRenderer.invoke('show-in-folder', targetPath),
  onJobLog: (callback: (payload: JobLog) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: JobLog) => callback(payload)
    ipcRenderer.on('job-log', listener)
    return () => ipcRenderer.removeListener('job-log', listener)
  },
  onJobStatus: (callback: (payload: JobStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: JobStatus) => callback(payload)
    ipcRenderer.on('job-status', listener)
    return () => ipcRenderer.removeListener('job-status', listener)
  }
}

contextBridge.exposeInMainWorld('psdApp', api)

export type PsdApi = typeof api

export interface JobLog {
  stream: 'stdout' | 'stderr' | 'system'
  text: string
}

export interface JobRunningStatus {
  state: 'running'
  psdPath: string
  outputRoot: string
  size: number
  startedAt: number
}

export interface JobDoneStatus {
  state: 'done'
  packageDir: string
  zipPath: string
  zipSize: number
  jsonPath: string
  assetDir: string
  finishedAt: number
}

export interface JobFailedStatus {
  state: 'failed'
  message: string
  finishedAt: number
}

export type JobStatus = JobRunningStatus | JobDoneStatus | JobFailedStatus
