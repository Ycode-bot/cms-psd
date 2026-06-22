import JSZip from 'jszip'
import { readPsd } from 'ag-psd'

type LogFn = (text: string, stream?: 'stdout' | 'stderr' | 'system') => void
const COMPRESS_API_BASE = (
  import.meta.env.VITE_COMPRESS_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '')
).replace(/\/+$/, '')

interface ConvertOptions {
  debug: boolean
  onLog: LogFn
}

export interface WebConversionResult {
  state: 'done'
  packageName: string
  zipName: string
  zipSize: number
  zipBlob: Blob
  jsonBlob: Blob
  assetsBlob: Blob
  finishedAt: number
}

interface AssetFile {
  name: string
  path: string
  blob: Blob
  compression: CompressionItem
}

interface CompressionItem {
  file: string
  provider: 'tinify' | 'browser-webp' | 'none'
  status: 'compressed' | 'kept' | 'failed'
  originalBytes: number
  compressedBytes: number
  savedBytes: number
  savedPercent: number
  outputFormat: 'png' | 'webp'
  reason?: string
  tinifyError?: string
}

interface LayerRecord {
  name: string
  path: string
  kind: string
  visible: boolean
  isGroup: boolean
  bbox: BBox
  children?: LayerRecord[]
}

interface BBox {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

const CHINESE_COMPONENT_ALIASES: Record<string, string> = {
  奖池升级: 'drawPool2',
  奖池升级节日主题: 'drawPool2',
  抽奖: 'drawPool2',
  金币抽奖: 'cntDraw',
  倒计时: 'countDown',
  选项卡: 'tabComp',
  tab: 'tabComp',
  榜单: 'commonGiftRank',
  礼物榜单: 'commonGiftRank',
  日榜: 'commonDailyRank',
  任务: 'taskDraw',
  任务抽奖: 'taskDraw',
  报名: 'signUp2',
  报名组: 'signUpGroup',
  兑换: 'giftExchange',
  礼物兑换: 'giftExchange',
  盲盒: 'blackbox'
}

const GENERATED_COMPONENTS = new Set([
  'piccomponent',
  'countDown',
  'tabComp',
  'drawPool2',
  'drawPool',
  'blackbox',
  'taskDraw',
  'commonGiftRank',
  'commonDailyRank',
  'h2hRank',
  'signUp2',
  'signUpGroup',
  'giftExchange',
  'cntDraw'
])

export async function convertPsdInBrowser(file: File, options: ConvertOptions): Promise<WebConversionResult> {
  const { debug, onLog } = options
  onLog(`读取 PSD：${file.name}\n`)
  const arrayBuffer = await file.arrayBuffer()
  const psd = readPsd(arrayBuffer as any, { skipThumbnail: true, throwForMissingFeatures: false } as any) as any
  const cmsWidth = 750
  const packageName = `${slugify(stripExtension(file.name))}-${timestamp()}`
  const assets: Record<string, string> = {}
  const assetFiles: AssetFile[] = []
  const exportReport: any = { engine: 'browser-ag-psd', status: 'ok', assets: {}, cutAssets: [] }
  const layers = walkLayers(psd.children || [])
  const flatLayers = flattenLayers(psd.children || [])
  const detections = detectComponents(flatLayers)

  onLog(`画布尺寸：${psd.width} x ${psd.height}\n`)
  onLog(`读取图层：${flatLayers.length} 个\n`)

  for (const [layer, record] of flatLayers) {
    const cut = parseCutAnnotation(record.name)
    if (!cut || !record.visible || record.bbox.width <= 0 || record.bbox.height <= 0) continue
    try {
      const asset = await exportCutAsset(layer, record, cut, exportReport, onLog)
      assets[asset.assetName] = asset.file
      exportReport.assets[asset.assetName] = reportAsset(asset)
      exportReport.cutAssets.push(reportAsset(asset))
      assetFiles.push({ name: asset.assetName, path: asset.file, blob: asset.blob, compression: asset.compression })
      onLog(`导出切图：${asset.file}\n`)
    } catch (error) {
      exportReport.cutAssets.push({
        sourceType: 'cut-annotation',
        layerPath: record.path,
        cutName: cut.localName,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      })
      onLog(`切图失败：${record.path}\n`, 'stderr')
    }
  }

  const components: any[] = buildComponents(detections, exportReport.cutAssets)
  if (!components.length) {
    const fallback = await exportFullPage(psd, cmsWidth, onLog)
    assets.fullPage = fallback.file
    assetFiles.push({ name: fallback.assetName, path: fallback.file, blob: fallback.blob, compression: fallback.compression })
    exportReport.assets.fullPage = reportAsset(fallback)
    components.push({
      componentName: 'piccomponent',
      config: { url: ['asset://fullPage'] },
      meta: {
        confidence: 0.5,
        sourceType: 'browser-composite-fallback',
        todos: ['未检测到明确组件/切图标注，请人工确认页面切片范围', `上传 ${fallback.file} 并替换 asset://fullPage 为 CDN URL`]
      }
    })
    onLog('未检测到标注，已生成整页预览图 fallback。\n')
  }

  const inspectJson = {
    file: file.name,
    sizeBytes: file.size,
    width: psd.width,
    height: psd.height,
    mode: 'PSD',
    frames: 1,
    inspectEngine: 'browser-ag-psd',
    cmsWidth,
    scaleToCms: Number((cmsWidth / psd.width).toFixed(4)),
    textHints: extractTextHints(psd.children || [])
  }
  const theme = extractTheme(psd, inspectJson)
  const cmsConfig = {
    version: '1.0',
    page: {
      title: inspectJson.textHints.find((item) => /[A-Za-z\u4e00-\u9fff]/.test(item)) || stripExtension(file.name),
      backgroundColor: theme.tokens.backgroundColor,
      designWidth: psd.width,
      cmsWidth
    },
    assets,
    components
  }

  exportReport.detections = detections
  exportReport.compression = summarizeCompression(assetFiles.map((asset) => asset.compression))

  const zip = new JSZip()
  const assetsZip = new JSZip()
  for (const asset of assetFiles) {
    zip.file(asset.path, asset.blob)
    assetsZip.file(asset.path, asset.blob)
  }
  zip.file('cms-page-config.json', jsonText(cmsConfig))
  zip.file('theme.json', jsonText(theme))
  zip.file('theme.md', themeMarkdown(file.name, inspectJson, theme, exportReport.compression))
  if (debug) {
    zip.file('inspect/psd-inspect.json', jsonText(inspectJson))
    zip.file('inspect/layers.json', jsonText({ source: file.name, engine: 'browser-ag-psd', layers }))
    zip.file('inspect/component-detection.json', jsonText({ source: file.name, engine: 'browser-ag-psd', detections }))
    zip.file('inspect/export-report.json', jsonText(exportReport))
    zip.file('import-notes.md', importNotes(packageName, exportReport))
  }

  const [zipBlob, assetsBlob] = await Promise.all([
    zip.generateAsync({ type: 'blob' }),
    assetsZip.generateAsync({ type: 'blob' })
  ])
  const jsonBlob = new Blob([jsonText(cmsConfig)], { type: 'application/json;charset=utf-8' })
  onLog(`生成完成：${packageName}.zip\n`)
  return {
    state: 'done',
    packageName,
    zipName: `${packageName}.zip`,
    zipSize: zipBlob.size,
    zipBlob,
    jsonBlob,
    assetsBlob,
    finishedAt: Date.now()
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

function slugify(value: string): string {
  return (value || 'activity')
    .replace(/[^\w\u4e00-\u9fff.-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'activity'
}

function timestamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function bboxFromLayer(layer: any): BBox {
  const left = Math.round(layer.left || 0)
  const top = Math.round(layer.top || 0)
  const width = Math.max(0, Math.round(layer.width || layer.canvas?.width || 0))
  const height = Math.max(0, Math.round(layer.height || layer.canvas?.height || 0))
  return { left, top, right: left + width, bottom: top + height, width, height }
}

function walkLayers(children: any[], parentPath = ''): LayerRecord[] {
  return children.map((layer) => {
    const name = layer.name || ''
    const layerPath = parentPath ? `${parentPath}/${name}` : name
    const record: LayerRecord = {
      name,
      path: layerPath,
      kind: layer.text ? 'type' : layer.children ? 'group' : 'pixel',
      visible: layer.hidden !== true,
      isGroup: Array.isArray(layer.children),
      bbox: bboxFromLayer(layer)
    }
    if (record.isGroup) record.children = walkLayers(layer.children || [], layerPath)
    return record
  })
}

function flattenLayers(children: any[], parentPath = ''): Array<[any, LayerRecord]> {
  const items: Array<[any, LayerRecord]> = []
  for (const layer of children) {
    const name = layer.name || ''
    const layerPath = parentPath ? `${parentPath}/${name}` : name
    const record: LayerRecord = {
      name,
      path: layerPath,
      kind: layer.text ? 'type' : layer.children ? 'group' : 'pixel',
      visible: layer.hidden !== true,
      isGroup: Array.isArray(layer.children),
      bbox: bboxFromLayer(layer)
    }
    items.push([layer, record])
    if (record.isGroup) items.push(...flattenLayers(layer.children || [], layerPath))
  }
  return items
}

function getLayerCanvas(layer: any): HTMLCanvasElement | null {
  if (layer.canvas) return layer.canvas
  if (!layer.children?.length) return null
  const bbox = bboxFromLayer(layer)
  if (bbox.width <= 0 || bbox.height <= 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = bbox.width
  canvas.height = bbox.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  for (const child of [...layer.children].reverse()) {
    if (child.hidden === true) continue
    const childCanvas = getLayerCanvas(child)
    if (childCanvas) ctx.drawImage(childCanvas, (child.left || 0) - bbox.left, (child.top || 0) - bbox.top)
  }
  return canvas
}

function createCompositeCanvas(psd: any): HTMLCanvasElement {
  if (psd.canvas) return psd.canvas
  const canvas = document.createElement('canvas')
  canvas.width = psd.width
  canvas.height = psd.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  for (const layer of [...(psd.children || [])].reverse()) {
    if (layer.hidden === true) continue
    const layerCanvas = getLayerCanvas(layer)
    if (layerCanvas) ctx.drawImage(layerCanvas, layer.left || 0, layer.top || 0)
  }
  return canvas
}

function resizeCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (source.width === width && source.height === height) return source
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)
  }
  return canvas
}

async function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas export failed'))
    }, type, quality)
  })
}

async function compressAssetBlob(assetName: string, pngBlob: Blob, canvas: HTMLCanvasElement, onLog: LogFn) {
  const originalBytes = pngBlob.size
  try {
    const tinifyBlob = await compressWithServer(pngBlob, `${assetName}.png`)
    const result = chooseCompressedBlob({
      file: `assets/${assetName}.png`,
      provider: 'tinify',
      outputFormat: 'png',
      blob: tinifyBlob,
      originalBytes
    })
    onLog(`服务端 Tinify 压缩：${result.file}，节省 ${result.compression.savedPercent}%\n`)
    return result
  } catch (error) {
    const tinifyError = error instanceof Error ? error.message : String(error)
    onLog(`Tinify 压缩失败：${assetName}，降级本地压缩。${tinifyError}\n`, 'stderr')
    try {
      const webpBlob = await canvasBlob(canvas, 'image/webp', 0.82)
      if (webpBlob.type === 'image/webp' && webpBlob.size < pngBlob.size) {
        const result = chooseCompressedBlob({
          file: `assets/${assetName}.webp`,
          provider: 'browser-webp',
          outputFormat: 'webp',
          blob: webpBlob,
          originalBytes,
          tinifyError
        })
        onLog(`本地 WebP 压缩：${result.file}，节省 ${result.compression.savedPercent}%\n`)
        return result
      }
      const result = keepOriginalBlob(assetName, pngBlob, '本地 WebP 不小于 PNG，保留 PNG', tinifyError)
      onLog(`保留 PNG：${result.file}，本地压缩无收益。\n`)
      return result
    } catch (fallbackError) {
      const reason = `本地压缩失败：${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      const result = keepOriginalBlob(assetName, pngBlob, reason, tinifyError)
      onLog(`保留 PNG：${result.file}，${reason}\n`, 'stderr')
      return result
    }
  }
}

async function compressWithServer(blob: Blob, filename: string): Promise<Blob> {
  const formData = new FormData()
  formData.append('file', blob, filename)
  const response = await fetch(`${COMPRESS_API_BASE}/api/compress`, {
    method: 'POST',
    body: formData
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`compression server ${response.status}: ${text || response.statusText}`)
  }
  return response.blob()
}

function chooseCompressedBlob(input: {
  file: string
  provider: 'tinify' | 'browser-webp'
  outputFormat: 'png' | 'webp'
  blob: Blob
  originalBytes: number
  tinifyError?: string
}) {
  const compressedBytes = input.blob.size
  const savedBytes = Math.max(0, input.originalBytes - compressedBytes)
  const savedPercent = input.originalBytes ? Number(((savedBytes / input.originalBytes) * 100).toFixed(2)) : 0
  return {
    file: input.file,
    blob: input.blob,
    compression: {
      file: input.file,
      provider: input.provider,
      status: savedBytes > 0 ? 'compressed' : 'kept',
      originalBytes: input.originalBytes,
      compressedBytes,
      savedBytes,
      savedPercent,
      outputFormat: input.outputFormat,
      tinifyError: input.tinifyError
    } satisfies CompressionItem
  }
}

function keepOriginalBlob(assetName: string, blob: Blob, reason: string, tinifyError?: string) {
  const file = `assets/${assetName}.png`
  return {
    file,
    blob,
    compression: {
      file,
      provider: 'none',
      status: 'kept',
      originalBytes: blob.size,
      compressedBytes: blob.size,
      savedBytes: 0,
      savedPercent: 0,
      outputFormat: 'png',
      reason,
      tinifyError
    } satisfies CompressionItem
  }
}

function splitTrailingRequirement(value: string): [string, string] {
  value = (value || '').trim()
  const pairs: Record<string, string> = { ']': '[', '］': '［', ')': '(', '）': '（' }
  const closeChar = value[value.length - 1]
  const openChar = pairs[closeChar]
  if (!openChar) return [value, '']
  let depth = 0
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index]
    if (char === closeChar) depth += 1
    else if (char === openChar) {
      depth -= 1
      if (depth === 0) return [value.slice(0, index).trim() || value, value.slice(index + 1, -1).trim()]
    }
  }
  return [value, '']
}

function parseCutRequirement(requirement: string) {
  const rawRequirement = (requirement || '').trim()
  let targetWidth: number | null = null
  let targetHeight: number | null = null
  const compact = rawRequirement.match(/(?<!\d)(\d{2,5})\s*[xX×*]\s*(\d{2,5})(?!\d)/)
  if (compact) {
    targetWidth = Number(compact[1])
    targetHeight = Number(compact[2])
  } else {
    const width = rawRequirement.match(/(?:宽度|宽|width|w)\s*[:：=]?\s*(\d{2,5})/i)
    const height = rawRequirement.match(/(?:高度|高|height|h)\s*[:：=]?\s*(\d{2,5})/i)
    if (width) targetWidth = Number(width[1])
    if (height) targetHeight = Number(height[1])
  }
  return { rawRequirement, targetWidth, targetHeight, layoutNotes: [], visibilityNotes: [] }
}

function parseCutAnnotation(name: string) {
  const match = (name || '').match(/(?:切图|cut)\s*[:：]\s*(.+?)\s*$/i)
  if (!match) return null
  const [localName, requirement] = splitTrailingRequirement(match[1])
  return { localName: localName.trim(), ...parseCutRequirement(requirement) }
}

function parseCmsAnnotation(name: string): [string | null, string | null] {
  const match = (name || '').match(/cms:([A-Za-z][A-Za-z0-9_]*)(?:#([A-Za-z0-9_-]+))?/)
  return match ? [match[1], match[2] || match[1]] : [null, null]
}

function parseComponentAnnotation(name: string): [string | null, string | null, string | null] {
  const match = (name || '').match(/(?:组件|component)\s*[:：]\s*([^\[\]［］#\n\r]+?)(?:#([A-Za-z0-9_-]+))?\s*$/i)
  if (!match) return [null, null, null]
  const label = match[1].trim()
  const componentName = CHINESE_COMPONENT_ALIASES[label] || Object.entries(CHINESE_COMPONENT_ALIASES).find(([alias]) => label.includes(alias))?.[1] || null
  return [componentName, match[2] || slugify(label), label]
}

function detectComponents(flatLayers: Array<[any, LayerRecord]>) {
  const detections: any[] = []
  for (const [, record] of flatLayers) {
    if (!record.visible || parseCutAnnotation(record.name)) continue
    const [cmsComponent, cmsLocal] = parseCmsAnnotation(record.name)
    if (cmsComponent) {
      detections.push({
        componentName: cmsComponent,
        localName: cmsLocal,
        sourceLayer: record.path,
        bounds: record.bbox,
        confidence: GENERATED_COMPONENTS.has(cmsComponent) ? 0.99 : 0.7,
        generated: GENERATED_COMPONENTS.has(cmsComponent),
        sourceType: 'cms-annotation'
      })
      continue
    }
    const [componentName, localName, label] = parseComponentAnnotation(record.name)
    if (label) {
      detections.push({
        componentName: componentName || 'unknown',
        localName,
        sourceLayer: record.path,
        bounds: record.bbox,
        confidence: componentName ? 0.92 : 0.45,
        generated: Boolean(componentName),
        sourceType: 'component-annotation',
        componentLabel: label
      })
    }
  }
  return detections.sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left || a.sourceLayer.localeCompare(b.sourceLayer))
}

async function exportCutAsset(layer: any, record: LayerRecord, cut: any, report: any, onLog: LogFn) {
  let canvas = getLayerCanvas(layer)
  if (!canvas) throw new Error('layer canvas is empty')
  const originalWidth = canvas.width
  const originalHeight = canvas.height
  if (cut.targetWidth || cut.targetHeight) {
    canvas = resizeCanvas(canvas, cut.targetWidth || originalWidth, cut.targetHeight || originalHeight)
  }
  const assetName = uniqueAssetName(report.assets, cut.localName)
  const pngBlob = await canvasBlob(canvas)
  const compressed = await compressAssetBlob(assetName, pngBlob, canvas, onLog)
  return {
    assetName,
    file: compressed.file,
    assetRef: `asset://${assetName}`,
    sourceType: 'cut-annotation',
    layerPath: record.path,
    bounds: record.bbox,
    confidence: 1,
    cutName: cut.localName,
    rawRequirement: cut.rawRequirement,
    targetWidth: cut.targetWidth,
    targetHeight: cut.targetHeight,
    originalWidth,
    originalHeight,
    exportedWidth: canvas.width,
    exportedHeight: canvas.height,
    sizeStatus: originalWidth === canvas.width && originalHeight === canvas.height ? 'matched' : 'resized',
    fileSizeBytes: compressed.blob.size,
    compression: compressed.compression,
    blob: compressed.blob
  }
}

async function exportFullPage(psd: any, cmsWidth: number, onLog: LogFn) {
  const composite = createCompositeCanvas(psd)
  const height = Math.max(1, Math.round(composite.height * (cmsWidth / composite.width)))
  const canvas = resizeCanvas(composite, cmsWidth, height)
  const pngBlob = await canvasBlob(canvas)
  const compressed = await compressAssetBlob('fullPage', pngBlob, canvas, onLog)
  return {
    assetName: 'fullPage',
    file: compressed.file,
    assetRef: 'asset://fullPage',
    sourceType: 'browser-composite-fallback',
    exportedWidth: canvas.width,
    exportedHeight: canvas.height,
    fileSizeBytes: compressed.blob.size,
    compression: compressed.compression,
    blob: compressed.blob
  }
}

function reportAsset<T extends { blob?: Blob }>(asset: T): Omit<T, 'blob'> {
  const { blob: _blob, ...rest } = asset
  return rest
}

function summarizeCompression(items: CompressionItem[]) {
  const originalBytes = items.reduce((sum, item) => sum + item.originalBytes, 0)
  const compressedBytes = items.reduce((sum, item) => sum + item.compressedBytes, 0)
  const savedBytes = Math.max(0, originalBytes - compressedBytes)
  const tinifyCount = items.filter((item) => item.provider === 'tinify').length
  const fallbackCount = items.filter((item) => item.provider === 'browser-webp').length
  const keptCount = items.filter((item) => item.provider === 'none').length
  const failedCount = items.filter((item) => item.status === 'failed').length
  return {
    enabled: true,
    status: items.length === 0 ? 'skipped' : failedCount > 0 || keptCount > 0 ? 'partial' : 'ok',
    provider: 'tinify-browser-fallback',
    assetCount: items.length,
    tinifyCount,
    fallbackCount,
    keptCount,
    failedCount,
    originalBytes,
    compressedBytes,
    savedBytes,
    savedPercent: originalBytes ? Number(((savedBytes / originalBytes) * 100).toFixed(2)) : 0,
    items
  }
}

function uniqueAssetName(assets: Record<string, unknown>, baseName: string): string {
  const name = slugify(baseName)
  if (!assets[name]) return name
  let index = 2
  while (assets[`${name}-${index}`]) index += 1
  return `${name}-${index}`
}

function buildComponents(detections: any[], cutAssets: any[]) {
  const components: any[] = cutAssets
    .filter((item) => item.status !== 'failed' && item.assetRef)
    .map((item) => ({
      componentName: 'piccomponent',
      config: { url: [item.assetRef] },
      meta: {
        confidence: 1,
        sourceLayer: item.layerPath,
        sourceType: item.sourceType,
        cutName: item.cutName,
        rawRequirement: item.rawRequirement || '',
        targetWidth: item.targetWidth,
        targetHeight: item.targetHeight,
        exportedWidth: item.exportedWidth,
        exportedHeight: item.exportedHeight,
        generationMode: 'cut-asset-preview',
        todos: [`上传 ${item.file} 并替换 ${item.assetRef} 为 CDN URL`, '该组件来自 PSD `切图:` 标注，用于运营视觉验收和素材替换']
      }
    }))

  for (const item of detections.filter((d) => d.componentName && d.componentName !== 'unknown')) {
    item.generationMode = 'real-component'
    components.push(buildComponent(item))
  }
  return components
}

function buildComponent(detection: any) {
  const todos = componentTodos(detection.componentName)
  if (detection.componentName === 'piccomponent') {
    const assetRef = `asset://${slugify(detection.localName || 'piccomponent')}`
    return { componentName: 'piccomponent', config: { url: [assetRef] }, meta: { confidence: detection.confidence, sourceLayer: detection.sourceLayer, sourceType: detection.sourceType, todos: [`上传素材并替换 ${assetRef} 为 CDN URL`] } }
  }
  if (detection.componentName === 'countDown') {
    return {
      componentName: 'countDown',
      config: { actIdTest: '', actId: '', type: 1, actTime: '', ableDrag: true, width: 320, height: 120 },
      styleConfig: { backgroundColor: '', numBg: '#ffffff', numColor: '#8b3f12', numBorder: '#f1a84c', textColor: '#ffffff' },
      meta: { confidence: detection.confidence, sourceLayer: detection.sourceLayer, sourceType: detection.sourceType, todos }
    }
  }
  if (detection.componentName === 'tabComp') {
    return {
      componentName: 'tabComp',
      config: { tabs: [{ name: 'Upgrade Prize Pool', content: [] }, { name: 'Daily Task', content: [] }, { name: 'Leaderboard', content: [] }] },
      meta: { confidence: detection.confidence, sourceLayer: detection.sourceLayer, sourceType: detection.sourceType, todos }
    }
  }
  return { componentName: detection.componentName, config: {}, meta: { confidence: detection.confidence, sourceLayer: detection.sourceLayer, sourceType: detection.sourceType, todos } }
}

function componentTodos(componentName: string): string[] {
  if (['drawPool2', 'drawPool', 'blackbox', 'taskDraw', 'cntDraw'].includes(componentName)) return ['补充活动ID测试ID', '补充活动ID正式ID', '确认抽奖/奖池后台配置']
  if (['commonGiftRank', 'commonDailyRank', 'h2hRank'].includes(componentName)) return ['确认榜单组件类型', '补充榜单ID']
  if (['signUp2', 'signUpGroup'].includes(componentName)) return ['确认报名后台配置', '补充报名活动ID']
  return ['确认后台业务配置和业务ID']
}

function extractTextHints(children: any[], hints: string[] = []): string[] {
  for (const layer of children) {
    if (layer.name) hints.push(layer.name)
    if (layer.text?.text) hints.push(layer.text.text)
    if (layer.children) extractTextHints(layer.children, hints)
  }
  return [...new Set(hints.map((item) => String(item).replace(/\s+/g, ' ').trim()).filter((item) => item.length >= 2 && item.length <= 180))].slice(0, 300)
}

function extractTheme(psd: any, inspectJson: any) {
  const composite = createCompositeCanvas(psd)
  const sample = resizeCanvas(composite, 80, Math.max(1, Math.round(composite.height * (80 / composite.width))))
  const data = sample.getContext('2d')?.getImageData(0, 0, sample.width, sample.height).data
  const buckets = new Map<string, number>()
  if (data) {
    for (let index = 0; index < data.length; index += 20) {
      if (data[index + 3] < 16) continue
      const key = [data[index], data[index + 1], data[index + 2]].map((value) => Math.min(255, Math.round(value / 32) * 32)).join(',')
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }
  }
  const palette = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number)
    const luminance = Number((0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)).toFixed(4))
    return { hex: rgbToHex(r, g, b), count, luminance }
  })
  const dominant = palette[0]?.hex || '#000000'
  return {
    source: inspectJson.file,
    designWidth: inspectJson.width,
    designHeight: inspectJson.height,
    cmsWidth: inspectJson.cmsWidth,
    palette,
    tokens: {
      backgroundColor: palette.find((item) => item.luminance < 0.35)?.hex || dominant,
      primaryColor: dominant,
      secondaryColor: palette[1]?.hex || dominant,
      accentColor: palette.find((item) => item.luminance >= 0.25 && item.luminance <= 0.8)?.hex || dominant,
      textColor: palette.find((item) => item.luminance >= 0.55)?.hex || '#ffffff',
      borderColor: palette.at(-1)?.hex || dominant
    },
    notes: ['主题色由PSD合成图自动提取，运营和UI仍需人工确认。']
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function themeMarkdown(fileName: string, inspectJson: any, theme: any, compression: any): string {
  return `# Theme Notes

- PSD: \`${fileName}\`
- Design size: \`${inspectJson.width} x ${inspectJson.height}\`
- CMS width: \`${inspectJson.cmsWidth}\`
- Scale to CMS: \`${inspectJson.scaleToCms}\`
- Asset export engine: \`browser-ag-psd\`
- Background Color: \`${theme.tokens.backgroundColor}\`
- Primary Color: \`${theme.tokens.primaryColor}\`
- Secondary Color: \`${theme.tokens.secondaryColor}\`
- Accent Color: \`${theme.tokens.accentColor}\`
- Text Color: \`${theme.tokens.textColor}\`
- Border Color: \`${theme.tokens.borderColor}\`

## Image Compression

- Provider: \`${compression.provider}\`
- Status: \`${compression.status}\`
- Assets: \`${compression.assetCount}\` total, \`${compression.tinifyCount || 0}\` Tinify, \`${compression.fallbackCount || 0}\` browser fallback, \`${compression.keptCount || 0}\` kept
- Original size: \`${compression.originalBytes || 0}\` bytes
- Final size: \`${compression.compressedBytes || 0}\` bytes
- Saved: \`${compression.savedBytes || 0}\` bytes (\`${compression.savedPercent || 0}\`%)
`
}

function importNotes(packageName: string, exportReport: any): string {
  const assetNotes = Object.values<any>(exportReport.assets).map((item) => {
    const compression = item.compression
    const compressionText = compression ? `，压缩 \`${compression.provider}\`，节省 \`${compression.savedPercent}%\`` : ''
    return `- \`${item.file}\`: 来源 \`${item.sourceType}\`${compressionText}`
  })
  return `# Import Notes

- Package: \`${packageName}\`
- Import JSON: \`cms-page-config.json\`
- Local \`asset://\` references are placeholders. Upload files from \`assets/\` and replace them with CDN URLs before save/preview.
- Browser version uses \`ag-psd\` and Canvas. Complex Photoshop effects may need manual QA.

## Generated Assets

${assetNotes.length ? assetNotes.join('\n') : '- No assets were exported.'}
`
}
