#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPsd, initializeCanvas } from "ag-psd";
import { Image, createCanvas, loadImage } from "@napi-rs/canvas";

initializeCanvas(createCanvas, (source) => {
  const image = new Image();
  image.src = source;
  return image;
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPRESSIBLE_ASSET_SUFFIXES = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const CHINESE_COMPONENT_ALIASES = {
  "奖池升级": "drawPool2",
  "奖池升级节日主题": "drawPool2",
  "抽奖": "drawPool2",
  "金币抽奖": "cntDraw",
  "倒计时": "countDown",
  "选项卡": "tabComp",
  "tab": "tabComp",
  "榜单": "commonGiftRank",
  "礼物榜单": "commonGiftRank",
  "日榜": "commonDailyRank",
  "任务": "taskDraw",
  "任务抽奖": "taskDraw",
  "报名": "signUp2",
  "报名组": "signUpGroup",
  "兑换": "giftExchange",
  "礼物兑换": "giftExchange",
  "盲盒": "blackbox",
  "充值": "rechargeProgressBar",
  "充值进度": "rechargeProgressBar",
  "充值返点": "rebateCoupon",
  "返点": "rebateCoupon",
  "个人信息": "rebateCoupon"
};

const COMPONENT_ALIASES = {
  piccomponent: ["头图", "banner", "hero", "静态图", "静态图片"],
  countDown: ["倒计时", "countdown", "timer"],
  tabComp: ["选项卡", "tab", "tabs"],
  drawPool2: ["奖池升级", "抽奖", "draw", "lottery"],
  commonGiftRank: ["榜单", "leaderboard", "rank"],
  taskDraw: ["任务", "task"],
  signUp2: ["报名", "signup", "enroll"],
  giftExchange: ["兑换", "exchange"]
};

const GENERATED_COMPONENTS = new Set([
  "piccomponent",
  "countDown",
  "tabComp",
  "drawPool2",
  "drawPool",
  "blackbox",
  "taskDraw",
  "commonGiftRank",
  "commonDailyRank",
  "h2hRank",
  "signUp2",
  "signUpGroup",
  "giftExchange",
  "rechargeProgressBar",
  "rebateCoupon",
  "cntDraw"
]);

const BACKEND_DEPENDENT_COMPONENTS = new Set([
  "countDown",
  "drawPool2",
  "drawPool",
  "blackbox",
  "taskDraw",
  "commonGiftRank",
  "commonDailyRank",
  "h2hRank",
  "signUp2",
  "signUpGroup",
  "giftExchange",
  "rechargeProgressBar",
  "rebateCoupon",
  "cntDraw"
]);

const STATIC_PREVIEW_COMPONENTS = new Set(["tabComp"]);

function parseArgs(argv) {
  const args = {
    psd: "",
    out: "",
    engine: "ag-psd",
    localAssetBase: "",
    annotationManifest: "",
    debug: false,
    noCompress: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--out") args.out = argv[++index] || "";
    else if (value === "--engine") args.engine = argv[++index] || "ag-psd";
    else if (value === "--local-asset-base") args.localAssetBase = argv[++index] || "";
    else if (value === "--annotation-manifest") args.annotationManifest = argv[++index] || "";
    else if (value === "--debug") args.debug = true;
    else if (value === "--no-compress") args.noCompress = true;
    else if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    } else if (!args.psd) args.psd = value;
    else throw new Error(`Unexpected argument: ${value}`);
  }

  if (!args.psd) {
    printHelp();
    process.exit(2);
  }
  if (!["ag-psd", "composite"].includes(args.engine)) {
    throw new Error("--engine must be ag-psd or composite");
  }
  return args;
}

function printHelp() {
  console.log(`Usage: ./activity-cms-psd-node <file.psd> [--out <parent>] [--debug] [--no-compress]

Options:
  --out <parent>              Parent output directory
  --engine ag-psd|composite   Asset export engine, defaults to ag-psd
  --local-asset-base <url>    Write debug local-preview JSON with local asset URLs
  --annotation-manifest <json> Optional layerPath annotation manifest
  --debug                     Write inspect reports and import-notes.md
  --no-compress               Skip Tinify compression`);
}

function slugify(value) {
  const cleaned = String(value || "")
    .replace(/[^\w\u4e00-\u9fff.-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "activity";
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function resolvePath(value) {
  const expanded = String(value).replace(/^~(?=$|\/)/, process.env.HOME || "~");
  return path.resolve(expanded);
}

function uniquePackageDir(parent, name) {
  let candidate = path.join(parent, name);
  if (!fs.existsSync(candidate)) return candidate;
  for (let index = 2; ; index += 1) {
    candidate = path.join(parent, `${name}-${index}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
}

function resolveOutputDir(psdPath, out) {
  const parent = resolvePath(out || path.join(process.cwd(), "work", "activity-output"));
  return uniquePackageDir(parent, `${slugify(path.basename(psdPath, path.extname(psdPath)))}-${timestamp()}`);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeName(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function bboxFromLayer(layer) {
  const left = Math.round(layer.left || 0);
  const top = Math.round(layer.top || 0);
  const width = Math.max(0, Math.round(layer.width || layer.canvas?.width || 0));
  const height = Math.max(0, Math.round(layer.height || layer.canvas?.height || 0));
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function walkLayers(children = [], parentPath = "") {
  const records = [];
  for (const layer of children) {
    const name = layer.name || "";
    const layerPath = parentPath ? `${parentPath}/${name}` : name;
    const record = {
      name,
      path: layerPath,
      kind: layer.text ? "type" : layer.children ? "group" : "pixel",
      visible: layer.hidden !== true,
      isGroup: Array.isArray(layer.children),
      bbox: bboxFromLayer(layer)
    };
    if (record.isGroup) record.children = walkLayers(layer.children, layerPath);
    records.push(record);
  }
  return records;
}

function flattenLayers(children = [], parentPath = "") {
  const items = [];
  for (const layer of children) {
    const name = layer.name || "";
    const layerPath = parentPath ? `${parentPath}/${name}` : name;
    const record = {
      name,
      path: layerPath,
      kind: layer.text ? "type" : layer.children ? "group" : "pixel",
      visible: layer.hidden !== true,
      isGroup: Array.isArray(layer.children),
      bbox: bboxFromLayer(layer)
    };
    items.push([layer, record]);
    if (record.isGroup) items.push(...flattenLayers(layer.children, layerPath));
  }
  return items;
}

function parseCmsAnnotation(name) {
  const match = String(name || "").match(/cms:([A-Za-z][A-Za-z0-9_]*)(?:#([A-Za-z0-9_-]+))?/);
  if (!match) return [null, null];
  return [match[1], match[2] || match[1]];
}

function splitTrailingRequirement(value) {
  value = String(value || "").trim();
  const pairs = { "]": "[", "］": "［", ")": "(", "）": "（" };
  const closeChar = value[value.length - 1];
  const openChar = pairs[closeChar];
  if (!openChar) return [value, ""];
  let depth = 0;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index];
    if (char === closeChar) depth += 1;
    else if (char === openChar) {
      depth -= 1;
      if (depth === 0) return [value.slice(0, index).trim() || value, value.slice(index + 1, -1).trim()];
    }
  }
  return [value, ""];
}

function parseCutRequirement(requirement) {
  const rawRequirement = String(requirement || "").trim();
  let targetWidth = null;
  let targetHeight = null;
  if (rawRequirement) {
    const compact = rawRequirement.match(/(?<!\d)(\d{2,5})\s*[xX×*]\s*(\d{2,5})(?!\d)/);
    if (compact) {
      targetWidth = Number(compact[1]);
      targetHeight = Number(compact[2]);
    } else {
      const width = rawRequirement.match(/(?:宽度|宽|width|w)\s*[:：=]?\s*(\d{2,5})/i);
      const height = rawRequirement.match(/(?:高度|高|height|h)\s*[:：=]?\s*(\d{2,5})/i);
      if (width) targetWidth = Number(width[1]);
      if (height) targetHeight = Number(height[1]);
    }
  }

  const fragments = rawRequirement.split(/[,，;；、\n\r]+/).map((item) => item.trim()).filter(Boolean);
  const layoutKeywords = ["留白", "留出", "空白", "顶部", "上方", "下方", "左侧", "右侧", "距离", "间距"];
  const visibilityKeywords = ["清空", "不显示", "透明", "隐藏"];
  return {
    rawRequirement,
    targetWidth,
    targetHeight,
    layoutNotes: fragments.filter((item) => layoutKeywords.some((keyword) => item.includes(keyword))),
    visibilityNotes: fragments.filter((item) => visibilityKeywords.some((keyword) => item.includes(keyword)))
  };
}

function parseCutAnnotation(name) {
  const match = String(name || "").match(/(?:切图|cut)\s*[:：]\s*(.+?)\s*$/i);
  if (!match) return null;
  const [localName, requirement] = splitTrailingRequirement(match[1]);
  return { localName: localName.trim(), ...parseCutRequirement(requirement) };
}

function parseComponentAnnotation(name) {
  const match = String(name || "").match(/(?:组件|component)\s*[:：]\s*([^\[\]［］#\n\r]+?)(?:#([A-Za-z0-9_-]+))?\s*$/i);
  if (!match) return [null, null, null];
  const label = match[1].trim();
  const labelNorm = normalizeName(label);
  let componentName = CHINESE_COMPONENT_ALIASES[label] || null;
  if (!componentName) {
    for (const [alias, mappedName] of Object.entries(CHINESE_COMPONENT_ALIASES)) {
      if (labelNorm.includes(normalizeName(alias))) {
        componentName = mappedName;
        break;
      }
    }
  }
  return [componentName, match[2] || slugify(label), label];
}

function parseFieldAnnotation(name, prefix) {
  const match = String(name || "").match(new RegExp(`${prefix}:([A-Za-z][A-Za-z0-9_]*)`));
  return match ? match[1] : null;
}

function detectAliasComponent(name) {
  const nameNorm = normalizeName(name);
  for (const [componentName, aliases] of Object.entries(COMPONENT_ALIASES)) {
    for (const alias of aliases) {
      if (nameNorm.includes(normalizeName(alias))) return [componentName, `name contains alias: ${alias}`];
    }
  }
  return [null, "no component alias"];
}

function detectComponentLayers(flatLayers) {
  const detections = [];
  const hasExplicit = flatLayers.some(([, record]) => record.visible && (parseComponentAnnotation(record.name)[2] || parseCmsAnnotation(record.name)[0]));
  for (const [, record] of flatLayers) {
    if (!record.visible || parseCutAnnotation(record.name)) continue;
    const [cmsComponent, cmsLocal] = parseCmsAnnotation(record.name);
    if (cmsComponent) {
      const hasBounds = record.bbox.width > 0 && record.bbox.height > 0;
      detections.push({
        componentName: cmsComponent,
        localName: cmsLocal,
        sourceLayer: record.path,
        bounds: record.bbox,
        confidence: GENERATED_COMPONENTS.has(cmsComponent) ? 0.99 : 0.7,
        generated: GENERATED_COMPONENTS.has(cmsComponent) && hasBounds,
        sourceType: "cms-annotation",
        reason: hasBounds ? "explicit cms annotation" : "explicit cms annotation without visual bounds"
      });
      continue;
    }

    const [componentName, localName, label] = parseComponentAnnotation(record.name);
    if (label) {
      detections.push({
        componentName: componentName || "unknown",
        localName,
        sourceLayer: record.path,
        bounds: record.bbox,
        confidence: componentName ? 0.92 : 0.45,
        generated: false,
        sourceType: "component-annotation",
        componentLabel: label,
        reason: componentName ? `中文组件标注：${label}` : `中文组件标注未匹配组件清单：${label}`
      });
      continue;
    }

    if (hasExplicit || record.bbox.width <= 0 || record.bbox.height <= 0) continue;
    const [aliasComponent, reason] = detectAliasComponent(record.name);
    if (aliasComponent) {
      detections.push({
        componentName: aliasComponent,
        localName: slugify(record.name),
        sourceLayer: record.path,
        bounds: record.bbox,
        confidence: 0.55,
        generated: false,
        sourceType: "alias-candidate",
        reason: `${reason}; candidate only because PSD is not explicitly annotated`
      });
    }
  }
  detections.sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left || a.sourceLayer.localeCompare(b.sourceLayer));
  return detections;
}

function getLayerCanvas(layer) {
  if (layer.canvas) return layer.canvas;
  if (!layer.children?.length) return null;
  const bbox = bboxFromLayer(layer);
  if (bbox.width <= 0 || bbox.height <= 0) return null;
  const canvas = createCanvas(bbox.width, bbox.height);
  const ctx = canvas.getContext("2d");
  const children = [...layer.children].reverse();
  for (const child of children) {
    if (child.hidden === true) continue;
    const childCanvas = getLayerCanvas(child);
    if (!childCanvas) continue;
    ctx.drawImage(childCanvas, (child.left || 0) - bbox.left, (child.top || 0) - bbox.top);
  }
  return canvas;
}

function resizeCanvas(source, width, height) {
  if (source.width === width && source.height === height) return source;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function resizeToCmsWidth(source, cmsWidth) {
  if (source.width < cmsWidth * 0.45 || Math.abs(source.width - cmsWidth) <= 2) return source;
  const height = Math.max(1, Math.round(source.height * (cmsWidth / source.width)));
  return resizeCanvas(source, cmsWidth, height);
}

function savePng(canvas, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
}

function uniqueAssetName(assets, baseName) {
  const assetName = slugify(baseName);
  if (!assets[assetName]) return assetName;
  for (let index = 2; ; index += 1) {
    const candidate = `${assetName}-${index}`;
    if (!assets[candidate]) return candidate;
  }
}

function exportCutAsset(layer, record, cutInfo, report, assetsDir) {
  let canvas = getLayerCanvas(layer);
  if (!canvas) throw new Error("layer canvas is empty");
  const originalWidth = canvas.width;
  const originalHeight = canvas.height;
  const targetWidth = cutInfo.targetWidth;
  const targetHeight = cutInfo.targetHeight;
  let resized = false;
  let sizeStatus = "default-size";
  if (targetWidth || targetHeight) {
    const exportWidth = targetWidth || originalWidth;
    const exportHeight = targetHeight || originalHeight;
    canvas = resizeCanvas(canvas, exportWidth, exportHeight);
    resized = originalWidth !== exportWidth || originalHeight !== exportHeight;
    sizeStatus = resized ? "resized" : "matched";
  }
  const notes = [...(cutInfo.layoutNotes || []), ...(cutInfo.visibilityNotes || [])];
  const sizeWarning = notes.length ? notes.map((note) => `已记录要求「${note}」，未自动修改图片内容`).join("；") : "";
  const assetName = uniqueAssetName(report.assets, cutInfo.localName);
  const outputPath = path.join(assetsDir, `${assetName}.png`);
  savePng(canvas, outputPath);
  return {
    assetName,
    file: `assets/${assetName}.png`,
    assetRef: `asset://${assetName}`,
    sourceType: "cut-annotation",
    layerPath: record.path,
    bounds: record.bbox,
    confidence: 1,
    cutName: cutInfo.localName,
    rawRequirement: cutInfo.rawRequirement,
    layoutNotes: cutInfo.layoutNotes,
    visibilityNotes: cutInfo.visibilityNotes,
    targetWidth,
    targetHeight,
    originalWidth,
    originalHeight,
    exportedWidth: canvas.width,
    exportedHeight: canvas.height,
    resized,
    sizeStatus,
    sizeWarning,
    fileSizeBytes: fs.statSync(outputPath).size
  };
}

function exportComponentAsset(layer, detection, assetsDir, cmsWidth) {
  const source = getLayerCanvas(layer);
  if (!source) throw new Error("layer canvas is empty");
  const canvas = resizeToCmsWidth(source, cmsWidth);
  const assetName = slugify(detection.localName);
  const outputPath = path.join(assetsDir, `${assetName}.png`);
  savePng(canvas, outputPath);
  return {
    assetName,
    file: `assets/${assetName}.png`,
    assetRef: `asset://${assetName}`,
    sourceType: "ag-psd-component-asset",
    layerPath: detection.sourceLayer,
    bounds: detection.bounds,
    confidence: detection.confidence,
    exportedWidth: canvas.width,
    exportedHeight: canvas.height,
    fileSizeBytes: fs.statSync(outputPath).size
  };
}

function findFlatRecord(flatLayers, layerPath) {
  return flatLayers.find(([, record]) => record.path === layerPath) || null;
}

function applyAnnotationManifest(manifest, flatLayers, detections, report, assetsDir) {
  if (!manifest) return;
  report.annotationManifest = manifest;
  report.cutAssets ||= [];
  if (manifest.components?.length) {
    for (let index = detections.length - 1; index >= 0; index -= 1) {
      if (detections[index].sourceType === "alias-candidate") detections.splice(index, 1);
    }
  }

  for (const item of manifest.cuts || []) {
    const match = findFlatRecord(flatLayers, item.layerPath);
    if (!match) {
      report.cutAssets.push({ sourceType: "annotation-manifest", layerPath: item.layerPath, cutName: item.name, status: "failed", error: "layerPath not found in PSD" });
      continue;
    }
    const [layer, record] = match;
    try {
      const assetInfo = exportCutAsset(layer, record, { localName: item.name || record.name, targetWidth: item.targetWidth, targetHeight: item.targetHeight, rawRequirement: "", layoutNotes: [], visibilityNotes: [] }, report, assetsDir);
      assetInfo.sourceType = "annotation-manifest-cut";
      report.assets[assetInfo.assetName] = assetInfo;
      report.cutAssets.push(assetInfo);
    } catch (error) {
      report.cutAssets.push({ sourceType: "annotation-manifest", layerPath: item.layerPath, cutName: item.name, status: "failed", error: error.message });
    }
  }

  for (const item of manifest.components || []) {
    const label = item.label || item.name;
    if (!label) continue;
    const [componentName, localName, parsedLabel] = parseComponentAnnotation(`组件:${label}`);
    const match = item.layerPath ? findFlatRecord(flatLayers, item.layerPath) : null;
    detections.push({
      componentName: componentName || "unknown",
      localName: localName || slugify(label),
      sourceLayer: item.layerPath || `annotation-manifest/组件:${label}`,
      bounds: match ? match[1].bbox : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 },
      confidence: componentName ? 0.92 : 0.45,
      generated: false,
      sourceType: "component-annotation",
      componentLabel: parsedLabel || label,
      reason: componentName ? `annotation manifest 组件标注：${label}` : `annotation manifest 组件标注未匹配组件清单：${label}`
    });
  }
  detections.sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left || a.sourceLayer.localeCompare(b.sourceLayer));
}

function readPsdDocument(psdPath) {
  const buffer = fs.readFileSync(psdPath);
  return readPsd(buffer, { skipThumbnail: true, throwForMissingFeatures: false });
}

function extractTextHintsFromTree(children = [], hints = []) {
  for (const layer of children) {
    if (layer.name) hints.push(layer.name);
    const text = layer.text?.text || layer.text?.value;
    if (text) hints.push(text);
    if (layer.children) extractTextHintsFromTree(layer.children, hints);
  }
  return [...new Set(hints.map((item) => String(item).replace(/\s+/g, " ").trim()).filter((item) => item.length >= 2 && item.length <= 180))].slice(0, 300);
}

function createCompositeCanvas(psd) {
  if (psd.canvas) return psd.canvas;
  const canvas = createCanvas(psd.width, psd.height);
  const ctx = canvas.getContext("2d");
  for (const layer of [...(psd.children || [])].reverse()) {
    if (layer.hidden === true) continue;
    const layerCanvas = getLayerCanvas(layer);
    if (layerCanvas) ctx.drawImage(layerCanvas, layer.left || 0, layer.top || 0);
  }
  return canvas;
}

function inspectPsd(psdPath, psd, inspectDir) {
  const composite = createCompositeCanvas(psd);
  const previewWidth = 750;
  const previewHeight = Math.max(1, Math.round(composite.height * (previewWidth / composite.width)));
  const preview = resizeCanvas(composite, previewWidth, previewHeight);
  const previewPath = path.join(inspectDir, "preview.png");
  savePng(preview, previewPath);
  const metadata = {
    file: psdPath,
    sizeBytes: fs.statSync(psdPath).size,
    width: psd.width,
    height: psd.height,
    mode: "PSD",
    frames: 1,
    inspectEngine: "ag-psd",
    cmsWidth: 750,
    scaleToCms: Number((750 / psd.width).toFixed(4)),
    preview: previewPath,
    textHints: extractTextHintsFromTree(psd.children || [])
  };
  writeJson(path.join(inspectDir, "psd-inspect.json"), metadata);
  return metadata;
}

function exportLayerAssets(psd, psdPath, assetsDir, inspectDir, cmsWidth, annotationManifest) {
  const report = { engine: "ag-psd", status: "ok", assets: {} };
  const tree = walkLayers(psd.children || []);
  const flatLayers = flattenLayers(psd.children || []);
  const detections = detectComponentLayers(flatLayers);
  writeJson(path.join(inspectDir, "layers.json"), { source: psdPath, engine: "ag-psd", canvasWidth: psd.width, canvasHeight: psd.height, layers: tree });

  const cutAssets = [];
  for (const [layer, record] of flatLayers) {
    const cutInfo = parseCutAnnotation(record.name);
    if (!cutInfo || !record.visible || record.bbox.width <= 0 || record.bbox.height <= 0) continue;
    try {
      const assetInfo = exportCutAsset(layer, record, cutInfo, report, assetsDir);
      report.assets[assetInfo.assetName] = assetInfo;
      cutAssets.push(assetInfo);
    } catch (error) {
      cutAssets.push({ sourceType: "cut-annotation", layerPath: record.path, bounds: record.bbox, cutName: cutInfo.localName, rawRequirement: cutInfo.rawRequirement, layoutNotes: cutInfo.layoutNotes, visibilityNotes: cutInfo.visibilityNotes, targetWidth: cutInfo.targetWidth, targetHeight: cutInfo.targetHeight, status: "failed", error: error.message });
    }
  }
  report.cutAssets = cutAssets;
  applyAnnotationManifest(annotationManifest, flatLayers, detections, report, assetsDir);

  const generatedDetections = detections.filter((item) => item.generated && item.sourceType === "cms-annotation");
  for (const [layer, record] of flatLayers) {
    const detection = detections.find((item) => item.sourceLayer === record.path);
    if (detection?.generated) {
      try {
        const assetInfo = exportComponentAsset(layer, detection, assetsDir, cmsWidth);
        detection.assetName = assetInfo.assetName;
        detection.assetRef = assetInfo.assetRef;
        detection.assetFile = assetInfo.file;
        report.assets[assetInfo.assetName] = assetInfo;
      } catch (error) {
        detection.visualGenerated = false;
        detection.visualReason = `annotated visual export failed: ${error.message}`;
      }
    }

    const fieldName = parseFieldAnnotation(record.name, "asset");
    if (!fieldName || !record.visible || record.bbox.width <= 0 || record.bbox.height <= 0) continue;
    const parent = generatedDetections.find((item) => record.path.startsWith(`${item.sourceLayer}/`));
    if (!parent) continue;
    try {
      const source = getLayerCanvas(layer);
      if (!source) throw new Error("layer canvas is empty");
      const canvas = resizeToCmsWidth(source, cmsWidth);
      const assetName = slugify(`${parent.localName}-${fieldName}`);
      const outputPath = path.join(assetsDir, `${assetName}.png`);
      savePng(canvas, outputPath);
      const assetInfo = {
        assetName,
        file: `assets/${assetName}.png`,
        assetRef: `asset://${assetName}`,
        sourceType: "ag-psd-field-asset",
        fieldName,
        componentLayerPath: parent.sourceLayer,
        layerPath: record.path,
        bounds: record.bbox,
        confidence: 0.96,
        exportedWidth: canvas.width,
        exportedHeight: canvas.height,
        fileSizeBytes: fs.statSync(outputPath).size
      };
      parent.fieldAssets ||= {};
      parent.fieldAssets[fieldName] = { assetName, assetRef: assetInfo.assetRef, assetFile: assetInfo.file, sourceLayer: record.path, bounds: record.bbox };
      report.assets[assetName] = assetInfo;
    } catch (error) {
      parent.fieldAssetErrors ||= {};
      parent.fieldAssetErrors[fieldName] = error.message;
    }
  }

  report.detections = detections;
  writeJson(path.join(inspectDir, "component-detection.json"), { source: psdPath, engine: "ag-psd", detections });
  writeJson(path.join(inspectDir, "export-report.json"), report);
  return report;
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance([r, g, b]) {
  return Number((0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)).toFixed(4));
}

function extractTheme(psdPath, psd, inspectJson, packageDir) {
  const composite = createCompositeCanvas(psd);
  const sampleCanvas = resizeCanvas(composite, 90, Math.max(1, Math.round(composite.height * (90 / composite.width))));
  const data = sampleCanvas.getContext("2d").getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
  const buckets = new Map();
  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3];
    if (alpha < 16) continue;
    const r = Math.round(data[index] / 32) * 32;
    const g = Math.round(data[index + 1] / 32) * 32;
    const b = Math.round(data[index + 2] / 32) * 32;
    const key = `${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const palette = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => {
      const color = key.split(",").map(Number);
      return { hex: rgbToHex(...color), count, luminance: relativeLuminance(color) };
    });
  const dominant = palette[0]?.hex || "#000000";
  const light = palette.find((item) => item.luminance >= 0.55);
  const dark = palette.find((item) => item.luminance < 0.35);
  const accent = palette.find((item) => item.luminance >= 0.25 && item.luminance <= 0.8);
  const theme = {
    source: psdPath,
    designWidth: inspectJson.width,
    designHeight: inspectJson.height,
    cmsWidth: inspectJson.cmsWidth,
    palette,
    tokens: {
      backgroundColor: dark?.hex || dominant,
      primaryColor: dominant,
      secondaryColor: palette[1]?.hex || dominant,
      accentColor: accent?.hex || dominant,
      textColor: light?.hex || "#ffffff",
      borderColor: palette.at(-1)?.hex || dominant
    },
    notes: ["主题色由PSD合成图自动提取，运营和UI仍需人工确认。"]
  };
  writeJson(path.join(packageDir, "theme.json"), theme);
  return theme;
}

function componentMeta(detection, todos = []) {
  const meta = {
    confidence: detection.confidence ?? 0.99,
    sourceLayer: detection.sourceLayer,
    sourceType: detection.sourceType
  };
  if (detection.relatedCutAssets) meta.relatedCutAssets = detection.relatedCutAssets;
  if (todos.length) meta.todos = todos;
  return meta;
}

function componentCandidateTodos(componentName) {
  if (componentName === "countDown") return ["补充活动ID测试ID", "补充活动ID正式ID", "确认倒计时活动时间来源"];
  if (["drawPool2", "drawPool", "blackbox", "taskDraw", "cntDraw"].includes(componentName)) return ["补充活动ID测试ID", "补充活动ID正式ID", "确认抽奖/奖池后台配置", "确认标题图、奖池图、礼物列表等字段后再用于上线"];
  if (["commonGiftRank", "commonDailyRank", "h2hRank"].includes(componentName)) return ["确认榜单组件类型", "补充榜单ID"];
  if (["signUp2", "signUpGroup"].includes(componentName)) return ["确认报名后台配置", "补充报名活动ID"];
  if (componentName === "giftExchange") return ["确认兑换后台配置和业务ID"];
  if (componentName === "tabComp") return ["确认 tab 名称和 tab 内组件结构后再用于上线"];
  return [`确认 ${componentName} 的后台业务配置和业务ID`];
}

function buildStaticPreviewComponent(detection, reasonTodos = []) {
  const assetRef = detection.assetRef || `asset://${slugify(detection.localName)}`;
  const assetFile = detection.assetFile || detection.localName || assetRef;
  return {
    componentName: "piccomponent",
    config: { url: [assetRef] },
    meta: {
      ...componentMeta(detection, [`上传 ${assetFile} 并替换 ${assetRef} 为 CDN URL`, ...reasonTodos]),
      sourceComponentName: detection.componentName,
      generationMode: "static-preview"
    }
  };
}

function buildComponentFromDetection(detection) {
  const componentName = detection.componentName;
  if (componentName === "piccomponent") {
    const assetRef = detection.assetRef || `asset://${slugify(detection.localName)}`;
    return { componentName: "piccomponent", config: { url: [assetRef] }, meta: componentMeta(detection, [`上传 ${detection.assetFile || detection.localName} 并替换 ${assetRef} 为 CDN URL`]) };
  }
  if (componentName === "countDown") {
    return {
      componentName: "countDown",
      config: { actIdTest: "", actId: "", type: 1, actTime: "", ableDrag: true, width: 320, height: 120 },
      styleConfig: { backgroundColor: "", numBg: "#ffffff", numColor: "#8b3f12", numBorder: "#f1a84c", textColor: "#ffffff" },
      meta: componentMeta(detection, componentCandidateTodos(componentName))
    };
  }
  if (componentName === "tabComp") {
    return {
      componentName: "tabComp",
      config: { tabs: [{ name: "Upgrade Prize Pool", content: [] }, { name: "Daily Task", content: [] }, { name: "Leaderboard", content: [] }] },
      meta: componentMeta(detection, ["真实 tab 结构候选；确认 tab 名称和 tab 内组件后再用于上线"])
    };
  }
  if (componentName === "drawPool2") {
    const fieldAssets = detection.fieldAssets || {};
    return {
      componentName: "drawPool2",
      config: {
        testId: "",
        actId: "",
        drawImg: fieldAssets.drawImg?.assetRef || "",
        poolImg: fieldAssets.poolImg?.assetRef || "",
        get: "get",
        drawText1: "Draw 1 time",
        drawText2: "Draw XX times",
        drawNum: "1, 10, 20, 50",
        leftChance: "You have XX more chances",
        record: "Record",
        times: "You have drawn XX time(s)"
      },
      styleConfig: { barrageBg: "#ede6fd", barrageColor: "#1e0d6f", contBg: "#1f0900", chanceColor: "#ffffff" },
      meta: componentMeta(detection, componentCandidateTodos(componentName))
    };
  }
  return { componentName, config: {}, meta: componentMeta(detection, componentCandidateTodos(componentName)) };
}

function buildComponentsFromDetections(detections, previewMode = false) {
  const generated = detections
    .filter((item) => item.componentName && item.componentName !== "unknown" && ["cms-annotation", "component-annotation"].includes(item.sourceType))
    .sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left || a.sourceLayer.localeCompare(b.sourceLayer));
  const components = [];
  for (const item of generated) {
    const shouldStatic = BACKEND_DEPENDENT_COMPONENTS.has(item.componentName) || STATIC_PREVIEW_COMPONENTS.has(item.componentName);
    if (previewMode && shouldStatic && item.assetRef) {
      item.jsonComponentName = "piccomponent";
      item.generationMode = "static-preview";
      item.realComponentCandidate = item.componentName;
      item.generatedAsRealComponent = false;
      item.candidateTodos = componentCandidateTodos(item.componentName);
      components.push(buildStaticPreviewComponent(item, item.candidateTodos));
      continue;
    }
    item.jsonComponentName = item.componentName;
    item.generationMode = "real-component";
    item.generatedAsRealComponent = true;
    item.generated = true;
    components.push(buildComponentFromDetection(item));
  }
  return components;
}

function buildCutAssetPreviewComponents(cutAssets) {
  return cutAssets.filter((item) => item.status !== "failed" && item.assetRef).map((item) => {
    const todos = [`上传 ${item.file || item.assetRef} 并替换 ${item.assetRef} 为 CDN URL`, "该组件来自 PSD `切图:` 标注，用于运营视觉验收和素材替换"];
    if (item.rawRequirement) todos.push(`切图要求：${item.rawRequirement}`);
    for (const note of item.layoutNotes || []) todos.push(`确认版式要求：${note}`);
    for (const note of item.visibilityNotes || []) todos.push(`确认显示要求：${note}`);
    if (item.sizeWarning) todos.push(item.sizeWarning);
    return {
      componentName: "piccomponent",
      config: { url: [item.assetRef] },
      meta: {
        confidence: item.confidence ?? 1,
        sourceLayer: item.layerPath,
        sourceType: item.sourceType || "cut-annotation",
        cutName: item.cutName || item.assetName,
        rawRequirement: item.rawRequirement || "",
        layoutNotes: item.layoutNotes || [],
        visibilityNotes: item.visibilityNotes || [],
        targetWidth: item.targetWidth,
        targetHeight: item.targetHeight,
        exportedWidth: item.exportedWidth,
        exportedHeight: item.exportedHeight,
        sizeStatus: item.sizeStatus,
        sizeWarning: item.sizeWarning || "",
        generationMode: "cut-asset-preview",
        todos
      }
    };
  });
}

function bboxIntersectionArea(first, second) {
  const left = Math.max(first.left || 0, second.left || 0);
  const top = Math.max(first.top || 0, second.top || 0);
  const right = Math.min(first.right || 0, second.right || 0);
  const bottom = Math.min(first.bottom || 0, second.bottom || 0);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function attachRelatedCutAssets(detections, cutAssets) {
  const validCuts = cutAssets.filter((item) => item.status !== "failed" && item.assetRef && item.bounds);
  for (const detection of detections) {
    const related = [];
    for (const item of validCuts) {
      if (item.layerPath === detection.sourceLayer || bboxIntersectionArea(detection.bounds || {}, item.bounds || {}) > 0) {
        related.push({ cutName: item.cutName || item.assetName, assetRef: item.assetRef, file: item.file, layerPath: item.layerPath });
      }
    }
    if (related.length) detection.relatedCutAssets = related;
  }
}

function normalizeAssetBase(value) {
  return String(value || "").replace(/\/+$/, "");
}

function localizeAssetRefs(value, assetMap, assetBase) {
  if (typeof value === "string") {
    if (!value.startsWith("asset://")) return value;
    const assetName = value.replace("asset://", "");
    const assetPath = assetMap[assetName];
    return assetPath ? `${assetBase}/${path.basename(assetPath)}` : value;
  }
  if (Array.isArray(value)) return value.map((item) => localizeAssetRefs(item, assetMap, assetBase));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeAssetRefs(item, assetMap, assetBase)]));
  return value;
}

function buildLocalPreviewConfig(cmsConfig, assetMap, assetBase) {
  const preview = JSON.parse(JSON.stringify(cmsConfig));
  preview.assets = Object.fromEntries(Object.entries(assetMap).map(([assetName, assetPath]) => [assetName, `${assetBase}/${path.basename(assetPath)}`]));
  preview.components = localizeAssetRefs(preview.components || [], assetMap, assetBase);
  return preview;
}

async function compressAssetsWithTinify(assetsDir, enabled = true) {
  const imagePaths = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter((name) => COMPRESSIBLE_ASSET_SUFFIXES.has(path.extname(name).toLowerCase())).map((name) => path.join(assetsDir, name)).sort() : [];
  const originalTotal = imagePaths.reduce((sum, item) => sum + fs.statSync(item).size, 0);
  const summary = { enabled, status: enabled ? "pending" : "disabled", provider: "tinify", assetCount: imagePaths.length, successCount: 0, failedCount: 0, skippedCount: 0, originalBytes: originalTotal, compressedBytes: originalTotal, savedBytes: 0, savedPercent: 0, items: [] };
  if (!enabled) {
    summary.skippedCount = imagePaths.length;
    summary.items = imagePaths.map((item) => skippedCompressionItem(item, "compression disabled"));
    return summary;
  }
  const apiKey = process.env.ACTIVITY_CMS_PSD_TINIFY_KEY || process.env.TINIFY_API_KEY || "";
  if (!apiKey) {
    summary.status = "skipped";
    summary.reason = "missing Tinify API key; set ACTIVITY_CMS_PSD_TINIFY_KEY or TINIFY_API_KEY";
    summary.skippedCount = imagePaths.length;
    summary.items = imagePaths.map((item) => skippedCompressionItem(item, summary.reason));
    return summary;
  }
  let tinify;
  try {
    tinify = await import("tinify");
  } catch (error) {
    summary.status = "skipped";
    summary.reason = `tinify package is not installed: ${error.message}`;
    summary.skippedCount = imagePaths.length;
    summary.items = imagePaths.map((item) => skippedCompressionItem(item, summary.reason));
    return summary;
  }
  tinify.default.key = apiKey;
  summary.originalBytes = 0;
  summary.compressedBytes = 0;
  for (const itemPath of imagePaths) {
    const original = fs.statSync(itemPath).size;
    const item = { file: `assets/${path.basename(itemPath)}`, status: "pending", originalBytes: original, compressedBytes: original, savedBytes: 0, savedPercent: 0 };
    summary.originalBytes += original;
    try {
      await tinify.default.fromFile(itemPath).toFile(itemPath);
      const compressed = fs.statSync(itemPath).size;
      const saved = Math.max(0, original - compressed);
      Object.assign(item, { status: "compressed", compressedBytes: compressed, savedBytes: saved, savedPercent: original ? Number(((saved / original) * 100).toFixed(2)) : 0 });
      summary.successCount += 1;
      summary.compressedBytes += compressed;
    } catch (error) {
      item.status = "failed";
      item.error = error.message;
      summary.failedCount += 1;
      summary.compressedBytes += original;
    }
    summary.items.push(item);
  }
  summary.savedBytes = Math.max(0, summary.originalBytes - summary.compressedBytes);
  summary.savedPercent = summary.originalBytes ? Number(((summary.savedBytes / summary.originalBytes) * 100).toFixed(2)) : 0;
  summary.status = summary.failedCount && summary.successCount ? "partial" : summary.failedCount ? "failed" : "ok";
  return summary;
}

function skippedCompressionItem(filePath, reason) {
  const original = fs.statSync(filePath).size;
  return { file: `assets/${path.basename(filePath)}`, status: "skipped", reason, originalBytes: original, compressedBytes: original, savedBytes: 0, savedPercent: 0 };
}

function writeThemeMd(packageDir, psdPath, inspectJson, theme, engine, compression) {
  const lines = [
    "# Theme Notes",
    "",
    `- PSD: \`${psdPath}\``,
    `- Design size: \`${inspectJson.width} x ${inspectJson.height}\``,
    `- CMS width: \`${inspectJson.cmsWidth}\``,
    `- Scale to CMS: \`${inspectJson.scaleToCms}\``,
    `- Asset export engine: \`${engine}\``,
    `- Background Color: \`${theme.tokens.backgroundColor}\``,
    `- Primary Color: \`${theme.tokens.primaryColor}\``,
    `- Secondary Color: \`${theme.tokens.secondaryColor}\``,
    `- Accent Color: \`${theme.tokens.accentColor}\``,
    `- Text Color: \`${theme.tokens.textColor}\``,
    `- Border Color: \`${theme.tokens.borderColor}\``,
    "- See `theme.json` for the full extracted palette.",
    "",
    "## Image Compression",
    "",
    `- Provider: \`${compression.provider}\``,
    `- Status: \`${compression.status}\``,
    `- Assets: \`${compression.assetCount}\` total, \`${compression.successCount}\` compressed, \`${compression.failedCount}\` failed, \`${compression.skippedCount}\` skipped`,
    `- Original size: \`${compression.originalBytes}\` bytes`,
    `- Final size: \`${compression.compressedBytes}\` bytes`,
    `- Saved: \`${compression.savedBytes}\` bytes (\`${compression.savedPercent}\`%)`
  ];
  if (compression.reason) lines.push(`- Note: ${compression.reason}`);
  fs.writeFileSync(path.join(packageDir, "theme.md"), `${lines.join("\n")}\n`, "utf8");
}

function writeImportNotes(packageDir, psdPath, exportReport, detections) {
  const assetNotes = [];
  for (const item of exportReport.cutAssets || []) {
    if (item.status === "failed") assetNotes.push(`- \`切图:${item.cutName}\`: 导出失败，图层 \`${item.layerPath}\`，错误：${item.error}`);
    else assetNotes.push(`- \`${item.file}\`: \`切图:${item.cutName}\`，导出 \`${item.exportedWidth}x${item.exportedHeight}\`，图层 \`${item.layerPath}\``);
  }
  for (const [assetName, item] of Object.entries(exportReport.assets || {})) {
    if ((exportReport.cutAssets || []).some((cut) => cut.assetName === assetName)) continue;
    assetNotes.push(`- \`${item.file}\`: 来源 \`${item.sourceType}\`${item.layerPath ? `，图层 \`${item.layerPath}\`` : ""}`);
  }
  const componentNotes = detections.filter((item) => item.generationMode || item.sourceType !== "alias-candidate").map((item) => `- \`${item.sourceLayer}\` -> \`${item.jsonComponentName || item.componentName}\`，来源 \`${item.sourceType}\``);
  fs.writeFileSync(path.join(packageDir, "import-notes.md"), [
    "# Import Notes",
    "",
    `- PSD: \`${psdPath}\``,
    `- Package directory: \`${packageDir}\``,
    "- Import JSON: `cms-page-config.json`",
    "- Local `asset://` references are placeholders. Upload files from `assets/` and replace them with CDN URLs before save/preview.",
    "- This package was generated by the Node.js `ag-psd` pipeline.",
    "- Business IDs are intentionally blank. Fill test/formal activity IDs and any rank/task/draw backend IDs in JSON or the CMS right panel.",
    "",
    "## Generated Assets",
    "",
    assetNotes.length ? assetNotes.join("\n") : "- No assets were exported.",
    "",
    "## Generated Components",
    "",
    componentNotes.length ? componentNotes.join("\n") : "- No annotated components were generated."
  ].join("\n") + "\n", "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const psdPath = resolvePath(args.psd);
  if (!fs.existsSync(psdPath)) throw new Error(`PSD not found: ${psdPath}`);

  const packageDir = resolveOutputDir(psdPath, args.out);
  const assetsDir = path.join(packageDir, "assets");
  const inspectDir = args.debug ? path.join(packageDir, "inspect") : fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "activity-cms-psd-node-"));
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(inspectDir, { recursive: true });

  const annotationManifest = args.annotationManifest ? readJson(resolvePath(args.annotationManifest)) : null;
  const psd = readPsdDocument(psdPath);
  const inspectJson = inspectPsd(psdPath, psd, inspectDir);
  const cmsWidth = inspectJson.cmsWidth || 750;
  const exportReport = args.engine === "ag-psd"
    ? exportLayerAssets(psd, psdPath, assetsDir, inspectDir, cmsWidth, annotationManifest)
    : { engine: "composite", status: "skipped", assets: {}, cutAssets: [], detections: [] };

  const detections = exportReport.detections || [];
  const assetMap = {};
  for (const [assetName, item] of Object.entries(exportReport.assets || {})) {
    if (item.file) assetMap[assetName] = item.file;
  }

  attachRelatedCutAssets(detections, exportReport.cutAssets || []);
  const detectedComponents = buildComponentsFromDetections(detections, false);
  const cutPreviewComponents = buildCutAssetPreviewComponents(exportReport.cutAssets || []);
  let components = detectedComponents.length ? detectedComponents : cutPreviewComponents;
  if (!components.length) components = buildComponentsFromDetections(detections, true);

  const pageTitle = inspectJson.textHints.find((item) => /[A-Za-z]/.test(item)) || path.basename(psdPath, path.extname(psdPath));
  const theme = extractTheme(psdPath, psd, inspectJson, packageDir);
  const compression = await compressAssetsWithTinify(assetsDir, !args.noCompress);
  exportReport.compression = compression;
  writeJson(path.join(inspectDir, "export-report.json"), exportReport);
  writeJson(path.join(inspectDir, "component-detection.json"), { source: psdPath, engine: exportReport.engine, detections });

  const cmsConfig = {
    version: "1.0",
    page: {
      title: pageTitle,
      backgroundColor: theme.tokens.backgroundColor,
      designWidth: inspectJson.width,
      cmsWidth
    },
    assets: assetMap,
    components
  };
  writeJson(path.join(packageDir, "cms-page-config.json"), cmsConfig);
  writeThemeMd(packageDir, psdPath, inspectJson, theme, exportReport.engine || args.engine, compression);

  let localPreviewJson = null;
  if (args.debug && args.localAssetBase) {
    localPreviewJson = path.join(packageDir, "cms-page-config.local-preview.json");
    writeJson(localPreviewJson, buildLocalPreviewConfig(cmsConfig, assetMap, normalizeAssetBase(args.localAssetBase)));
  }
  if (args.debug) writeImportNotes(packageDir, psdPath, exportReport, detections);
  else fs.rmSync(inspectDir, { recursive: true, force: true });

  const result = {
    packageDir,
    importJson: path.join(packageDir, "cms-page-config.json"),
    assetsDir,
    themeJson: path.join(packageDir, "theme.json"),
    themeMd: path.join(packageDir, "theme.md"),
    engine: exportReport.engine || args.engine,
    debug: args.debug,
    compression: Object.fromEntries(Object.entries(compression).filter(([key]) => key !== "items"))
  };
  if (args.debug) {
    Object.assign(result, {
      localPreviewJson,
      inspectJson: path.join(inspectDir, "psd-inspect.json"),
      layersJson: path.join(inspectDir, "layers.json"),
      componentDetectionJson: path.join(inspectDir, "component-detection.json"),
      exportReportJson: path.join(inspectDir, "export-report.json"),
      preview: path.join(inspectDir, "preview.png"),
      importNotes: path.join(packageDir, "import-notes.md")
    });
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`activity-cms-psd-node failed: ${error.stack || error.message}`);
  process.exit(1);
});
