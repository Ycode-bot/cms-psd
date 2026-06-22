import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const source =
  process.env.ACTIVITY_CMS_PSD_NODE_SOURCE ||
  '/Users/yangdongyu/Documents/ima/ima-skills/skills/activity-cms-psd-node'
const dest = path.join(root, 'vendor', 'activity-cms-psd-node')
const ignored = new Set(['.git', '.DS_Store'])

function shouldSkip(rel) {
  const parts = rel.split(path.sep)
  return parts.some((part) => ignored.has(part))
}

function copyTree(src, target, base = src) {
  const rel = path.relative(base, src)
  if (rel && shouldSkip(rel)) return

  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true })
    for (const name of fs.readdirSync(src)) {
      copyTree(path.join(src, name), path.join(target, name), base)
    }
    return
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(src, target)
  fs.chmodSync(target, stat.mode)
}

function removeExtra(target, src, base = target) {
  if (!fs.existsSync(target)) return
  for (const name of fs.readdirSync(target)) {
    const targetPath = path.join(target, name)
    const rel = path.relative(base, targetPath)
    if (shouldSkip(rel)) continue
    const srcPath = path.join(src, name)
    if (!fs.existsSync(srcPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true })
      continue
    }
    if (fs.statSync(targetPath).isDirectory()) removeExtra(targetPath, srcPath, base)
  }
}

if (!fs.existsSync(path.join(source, 'activity-cms-psd-node'))) {
  throw new Error(`activity-cms-psd-node source not found: ${source}`)
}

fs.mkdirSync(dest, { recursive: true })
removeExtra(dest, source)
copyTree(source, dest)
console.log(`Synced activity-cms-psd-node -> ${dest}`)
