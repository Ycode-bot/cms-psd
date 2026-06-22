import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Bug, FileCode2, Folder, FolderOpen, Play, Square, Trash2, Upload } from 'lucide-react'
import type { JobDoneStatus, JobLog, JobStatus } from '../../preload'
import { convertPsdInBrowser, downloadBlob, type WebConversionResult } from './webConverter'

interface AppState {
  psdPath: string
  outputRoot: string
  running: boolean
  result: JobDoneStatus | WebConversionResult | null
}

function hasElectronApi(): boolean {
  return Boolean(window.psdApp)
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath
}

function logLine(payload: JobLog): string {
  const prefix = payload.stream === 'stderr' ? '[err] ' : payload.stream === 'stdout' ? '' : '[app] '
  return `${prefix}${payload.text}`
}

export default function App(): JSX.Element {
  const electronMode = hasElectronApi()
  const [state, setState] = useState<AppState>({
    psdPath: '',
    outputRoot: electronMode ? '' : '浏览器下载 ZIP',
    running: false,
    result: null
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [statusLabel, setStatusLabel] = useState('待处理')
  const [statusKind, setStatusKind] = useState('')
  const [meter, setMeter] = useState('0%')
  const [log, setLog] = useState('')
  const logRef = useRef<HTMLPreElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canStart = Boolean((electronMode ? state.psdPath && state.outputRoot : selectedFile) && !state.running)
  const fileHint = state.psdPath ? basename(state.psdPath) : '或点击选择本机 PSD'
  const zipText = state.result
    ? 'zipName' in state.result
      ? `${state.result.zipName} (${formatBytes(state.result.zipSize)})`
      : `${basename(state.result.zipPath)} (${formatBytes(state.result.zipSize)})`
    : '等待生成'

  const appendLog = (text: string, stream: JobLog['stream'] = 'system') => {
    setLog((current) => `${current}${logLine({ text, stream })}`)
  }

  const setPsdPath = (psdPath: string) => {
    setState((current) => ({ ...current, psdPath }))
  }

  const setOutputRoot = (outputRoot: string) => {
    setState((current) => ({ ...current, outputRoot }))
  }

  const setFile = (file: File) => {
    setSelectedFile(file)
    setPsdPath(file.name)
    setStatusLabel('待处理')
    setStatusKind('')
    setMeter('0%')
    setState((current) => ({ ...current, result: null }))
  }

  const choosePsd = async () => {
    if (!electronMode) {
      fileInputRef.current?.click()
      return
    }
    appendLog('打开 PSD 选择框...\n')
    try {
      const psdApp = window.psdApp!
      const filePath = await psdApp.choosePsd()
      if (filePath) {
        setPsdPath(filePath)
        appendLog(`已选择 PSD：${filePath}\n`)
      } else {
        appendLog('已取消选择 PSD\n')
      }
    } catch (error) {
      appendLog(`${error instanceof Error ? error.message : String(error)}\n`, 'stderr')
    }
  }

  const chooseOutput = async () => {
    if (!electronMode) {
      appendLog('网页端会直接下载 ZIP，不需要选择输出目录。\n')
      return
    }
    appendLog('打开输出目录选择框...\n')
    try {
      const psdApp = window.psdApp!
      const dirPath = await psdApp.chooseOutput()
      if (dirPath) {
        setOutputRoot(dirPath)
        appendLog(`已选择输出目录：${dirPath}\n`)
      } else {
        appendLog('已取消选择输出目录\n')
      }
    } catch (error) {
      appendLog(`${error instanceof Error ? error.message : String(error)}\n`, 'stderr')
    }
  }

  const startConversion = async () => {
    setState((current) => ({ ...current, running: true, result: null }))
    setStatusLabel('处理中')
    setStatusKind('running')
    setMeter('运行中')

    try {
      if (electronMode) {
        const psdApp = window.psdApp!
        const result = await psdApp.startConversion({
          psdPath: state.psdPath,
          outputRoot: state.outputRoot,
          debug: debugMode
        })
        setState((current) => ({ ...current, result }))
      } else {
        if (!selectedFile) throw new Error('请先选择 PSD 文件')
        const result = await convertPsdInBrowser(selectedFile, { debug: debugMode, onLog: appendLog })
        setState((current) => ({ ...current, result }))
        downloadBlob(result.zipBlob, result.zipName)
      }
      setStatusLabel('已完成')
      setStatusKind('done')
      setMeter('100%')
    } catch (error) {
      appendLog(`\n${error instanceof Error ? error.message : String(error)}\n`, 'stderr')
      setStatusLabel('失败')
      setStatusKind('failed')
      setMeter('失败')
    } finally {
      setState((current) => ({ ...current, running: false }))
    }
  }

  const cancelJob = async () => {
    if (electronMode) await window.psdApp!.cancelJob()
    appendLog(electronMode ? '已请求取消任务\n' : '网页端任务会在当前步骤完成后停止；如页面长时间无响应，请刷新页面。\n')
  }

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    for (const file of Array.from(event.dataTransfer.files)) {
      if (!file.name.toLowerCase().endsWith('.psd')) continue
      if (electronMode) {
        const filePath = window.psdApp!.getPathForFile(file)
        setPsdPath(filePath || file.name)
        appendLog(`已拖入 PSD：${filePath || file.name}\n`)
      } else {
        setFile(file)
        appendLog(`已选择 PSD：${file.name}\n`)
      }
      return
    }
    appendLog('拖入的文件不是 PSD，请重新选择。\n', 'stderr')
  }

  const resultReady = Boolean(state.result)
  const statusClass = useMemo(() => ['status-pill', statusKind].filter(Boolean).join(' '), [statusKind])

  useEffect(() => {
    if (!electronMode) {
      appendLog('运行模式：网页端浏览器转换\n')
      appendLog('输出方式：生成后自动下载 ZIP\n')
      return
    }
    const psdApp = window.psdApp!
    const removeLog = psdApp.onJobLog((payload) => setLog((current) => `${current}${logLine(payload)}`))
    const removeStatus = psdApp.onJobStatus((status: JobStatus) => {
      if (status.state === 'running') setMeter('运行中')
      if (status.state === 'done') {
        setState((current) => ({ ...current, result: status }))
        setStatusLabel('已完成')
        setStatusKind('done')
        setMeter('100%')
      }
      if (status.state === 'failed') {
        setStatusLabel('失败')
        setStatusKind('failed')
        setMeter('失败')
      }
    })
    psdApp.getDefaults().then((defaults) => {
      setOutputRoot(defaults.outputRoot)
      appendLog(`activity-cms-psd-node: ${defaults.activityCli}\n`)
      appendLog(`默认输出目录: ${defaults.outputRoot}\n`)
    })
    return () => {
      removeLog()
      removeStatus()
    }
  }, [electronMode])

  useEffect(() => {
    if (!logRef.current) return
    logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const openZip = () => {
    if (!state.result) return
    if ('zipBlob' in state.result) downloadBlob(state.result.zipBlob, state.result.zipName)
    else window.psdApp!.showInFolder(state.result.zipPath)
  }

  const openJson = () => {
    if (!state.result) return
    if ('jsonBlob' in state.result) downloadBlob(state.result.jsonBlob, 'cms-page-config.json')
    else window.psdApp!.openPath(state.result.jsonPath)
  }

  const openAssets = () => {
    if (!state.result) return
    if ('assetsBlob' in state.result) downloadBlob(state.result.assetsBlob, 'assets.zip')
    else window.psdApp!.openPath(state.result.assetDir)
  }

  return (
    <main className="shell">
      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept=".psd"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            setFile(file)
            appendLog(`已选择 PSD：${file.name}\n`)
          }
        }}
      />

      <section className="hero">
        <div>
          <p className="eyebrow">{electronMode ? 'activity-cms-psd-node' : 'browser activity-cms-psd'}</p>
          <h1>psd切图工具</h1>
        </div>
        <div className={statusClass}>{statusLabel}</div>
      </section>

      <section className="workspace">
        <div className="panel input-panel">
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button')) return
              choosePsd()
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setDragging(false)
            }}
            onDrop={onDrop}
          >
            <div className="drop-icon">Ps</div>
            <h2>拖入 PSD 文件</h2>
            <p>{fileHint}</p>
            <button className="secondary" disabled={state.running} onClick={choosePsd}>
              <Upload size={17} />
              选择 PSD
            </button>
          </div>

          <div className="field-stack">
            <label>
              <span>当前文件</span>
              <input readOnly value={state.psdPath} placeholder="尚未选择 PSD" />
            </label>
            <label>
              <span>{electronMode ? '输出目录' : '输出方式'}</span>
              <div className="inline-field">
                <input readOnly value={state.outputRoot} />
                <button className="icon-button" disabled={state.running || !electronMode} title="选择输出目录" onClick={chooseOutput}>
                  <FolderOpen size={18} />
                </button>
              </div>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={debugMode} disabled={state.running} onChange={(event) => setDebugMode(event.target.checked)} />
              <span>生成 debug 检查文件</span>
              <Bug size={16} />
            </label>
          </div>

          <div className="actions">
            <button className="primary" disabled={!canStart} onClick={startConversion}>
              <Play size={17} />
              开始生成
            </button>
            <button className="secondary danger" disabled={!state.running} onClick={cancelJob}>
              <Square size={16} />
              取消
            </button>
          </div>
        </div>

        <div className="panel result-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Output</p>
              <h2>处理结果</h2>
            </div>
            <div className="meter">{meter}</div>
          </div>

          <div className="result-grid">
            <button className="result-card" disabled={!resultReady} onClick={openZip}>
              <Archive size={18} />
              <span>ZIP 包</span>
              <strong>{zipText}</strong>
            </button>
            <button className="result-card" disabled={!resultReady} onClick={openJson}>
              <FileCode2 size={18} />
              <span>导入 JSON</span>
              <strong>cms-page-config.json</strong>
            </button>
            <button className="result-card" disabled={!resultReady} onClick={openAssets}>
              <Folder size={18} />
              <span>素材目录</span>
              <strong>{electronMode ? 'assets/' : 'assets.zip'}</strong>
            </button>
          </div>

          <div className="log-head">
            <span>运行日志</span>
            <button className="text-button" onClick={() => setLog('')}>
              <Trash2 size={15} />
              清空
            </button>
          </div>
          <div className="log-box">
            <pre ref={logRef}>{log}</pre>
            {state.running ? (
              <div className="log-loading" aria-live="polite">
                <span className="log-spinner" />
                <span>正在处理，请稍候</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
