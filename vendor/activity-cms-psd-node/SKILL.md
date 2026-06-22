---
name: activity-cms-psd-node
description: Generate activityincms whole-page JSON drafts from ordinary or annotated PSD activity designs using a Node.js PSD pipeline. Use when a user asks to turn PSD activity pages into CMS JSON with Node instead of Python, inspect PSD activity designs for activityincms, or prepare activity-output packages for the activityincms whole-page JSON importer without relying on psd-tools.
---

# Activity CMS PSD Node

Use this skill when converting a PSD activity design into an activityincms import package with the Node.js implementation.

The recommended input is a lightly annotated PSD that follows `references/psd-annotation-guide.md`. Treat `cms:` / `asset:` / `text:` / `style:` / `tab:` annotations and the simplified Chinese annotations as source of truth.

Preferred simplified annotations:

- `切图:<assetName>` or `切图:<assetName>[widthxheight]` for required PNG exports.
- `切图:<assetName>(requirements)` for extra size, layout, or visibility notes.
- `组件:<Chinese component label>` for real CMS component generation.

## Output Contract

Create the output package in a deterministic directory:

```txt
<current workspace>/work/activity-output/<psd-file-stem>-<YYYYMMDDHHMM>/
```

If the user provides `--out <path>` or says `输出到 <path>`, treat that path as the parent output directory. Create a child package directory named `<psd-file-stem>-<YYYYMMDDHHMM>/` inside it. If the same child directory already exists, append `-2`, `-3`, etc.

Run from this skill folder:

```bash
./activity-cms-psd-node <psd> --out <output-parent>
```

The first run installs local Node dependencies automatically via `install.sh` when `node_modules` is missing.

Default operator packages include only:

```txt
assets/
cms-page-config.json
theme.json
theme.md
```

Use `--debug` only when the user asks for inspect reports, fallback slice details, local preview JSON, or layer/component detection details. Debug packages may additionally include:

```txt
inspect/
  preview.png
  psd-inspect.json
  layers.json
  export-report.json
  component-detection.json
cms-page-config.local-preview.json
import-notes.md
```

`cms-page-config.json` must use the activityincms whole-page import format:

```json
{
  "version": "1.0",
  "page": {
    "title": "Activity Title",
    "backgroundColor": "#000000",
    "designWidth": 1500,
    "cmsWidth": 750
  },
  "assets": {
    "hero": "assets/hero.png"
  },
  "components": []
}
```

Component entries must be sparse overrides, not full CMS default configs. Use `componentName`, optional `config`, optional `styleConfig`, and optional `meta`.

For local sliced assets, use `asset://name` placeholders in JSON and explain in component `meta.todos` that operators must upload assets and replace them with CDN URLs before save/preview.

Assets in `assets/` are compressed by Tinify by default when `ACTIVITY_CMS_PSD_TINIFY_KEY` or `TINIFY_API_KEY` is configured. If no key is configured, package generation continues and `theme.md` records that compression was skipped. Use `--no-compress` to disable compression.

## Node Implementation Notes

The CLI uses:

- `ag-psd` for PSD parsing.
- `@napi-rs/canvas` for layer/composite PNG export, resizing, and simple color sampling.
- `tinify` for optional compression.

Photoshop and Python are not required for this Node skill.

Current Node limits versus the older Python implementation:

- It prioritizes explicit annotations and layer names. Low-confidence unannotated module inference is intentionally conservative.
- It exports annotated `切图:` layers/groups and annotated `cms:`/`组件:` component visual assets when the PSD parser exposes a canvas.
- Some complex Photoshop effects may rasterize differently from Adobe Photoshop or `psd-tools`; record parser/export failures in debug reports instead of silently guessing.

## Workflow

1. Run `./activity-cms-psd-node <psd> --out <output-parent>`.
2. Use `--debug` when layer reports or preview files are needed.
3. Inspect `cms-page-config.json`, upload files from `assets/`, and replace all `asset://` placeholders with CDN URLs.
4. Fill blank business IDs and backend configuration in activityincms before save/preview.

## Component Mapping Rules

Use these common mappings first:

- static visual block -> `piccomponent`
- editable title -> `titleComp`
- editable rich text/rules -> `textComp`
- tabs -> `tabComp`
- black-box draw / blind box -> `blackbox`
- prize pool upgrade with Draw 1/10/20/50, Prize Pool, Lv.1/Lv.2 -> prefer `drawPool2`, alternative `drawPool`
- task draw / task lottery -> `taskDraw`
- signup area -> `signUp2` or `signUpGroup`
- gift exchange -> `giftExchange`
- common rank -> `commonGiftRank`, `commonDailyRank`, or `h2hRank`

Do not infer business IDs from PSD names. Always leave activity, rank, task, signup, draw, and backend IDs blank with todos.

## References

- `references/psd-annotation-guide.md`: UI/operations PSD marking standard.
- `references/operator-usage.md`: how to invoke the skill and import JSON.
- `references/component-catalog.md`: activityincms component list with Chinese labels and English purposes.
- `references/example-psd-structure.md`: recommended PSD layer/group structures.
