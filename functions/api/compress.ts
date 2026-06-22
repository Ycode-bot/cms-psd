interface PagesContext {
  request: Request
  env: {
    TINIFY_API_KEY?: string
    ACTIVITY_CMS_PSD_TINIFY_KEY?: string
    MAX_IMAGE_BYTES?: string
  }
}

const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const tinifyApiKey = context.env.TINIFY_API_KEY || context.env.ACTIVITY_CMS_PSD_TINIFY_KEY
  const maxImageBytes = Number(context.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024)

  if (!tinifyApiKey) {
    return jsonError(500, 'TINIFY_API_KEY_MISSING', 'TINIFY_API_KEY is not configured')
  }

  let formData: FormData
  try {
    formData = await context.request.formData()
  } catch {
    return jsonError(400, 'INVALID_MULTIPART', 'request must be multipart/form-data')
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return jsonError(400, 'FILE_MISSING', 'multipart field "file" is required')
  }

  if (!allowedMimeTypes.has(file.type)) {
    return jsonError(415, 'UNSUPPORTED_IMAGE_TYPE', `unsupported image type: ${file.type || 'unknown'}`)
  }

  if (file.size > maxImageBytes) {
    return jsonError(413, 'IMAGE_TOO_LARGE', `image is larger than ${maxImageBytes} bytes`)
  }

  try {
    const input = await file.arrayBuffer()
    const compressed = await compressWithTinify(input, file.type, tinifyApiKey)
    const compressedBytes = compressed.bytes.byteLength
    const savedBytes = Math.max(0, input.byteLength - compressedBytes)
    const savedPercent = input.byteLength ? Number(((savedBytes / input.byteLength) * 100).toFixed(2)) : 0

    return new Response(compressed.bytes, {
      headers: {
        'Content-Type': compressed.contentType || file.type,
        'Cache-Control': 'no-store',
        'X-Compression-Provider': 'tinify',
        'X-Original-Bytes': String(input.byteLength),
        'X-Compressed-Bytes': String(compressedBytes),
        'X-Saved-Bytes': String(savedBytes),
        'X-Saved-Percent': String(savedPercent)
      }
    })
  } catch (error) {
    return jsonError(502, 'TINIFY_FAILED', error instanceof Error ? error.message : String(error))
  }
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  return Response.json({
    ok: true,
    tinifyConfigured: Boolean(context.env.TINIFY_API_KEY || context.env.ACTIVITY_CMS_PSD_TINIFY_KEY)
  })
}

async function compressWithTinify(input: ArrayBuffer, contentType: string, apiKey: string) {
  const auth = btoa(`api:${apiKey}`)
  const shrinkResponse = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': contentType
    },
    body: input
  })

  if (!shrinkResponse.ok && shrinkResponse.status !== 201) {
    const text = await shrinkResponse.text().catch(() => '')
    throw new Error(`Tinify shrink ${shrinkResponse.status}: ${text || shrinkResponse.statusText}`)
  }

  const location = shrinkResponse.headers.get('Location')
  if (!location) throw new Error('Tinify response missing Location header')

  const compressedResponse = await fetch(location, {
    headers: {
      Authorization: `Basic ${auth}`
    }
  })

  if (!compressedResponse.ok) {
    const text = await compressedResponse.text().catch(() => '')
    throw new Error(`Tinify download ${compressedResponse.status}: ${text || compressedResponse.statusText}`)
  }

  return {
    bytes: await compressedResponse.arrayBuffer(),
    contentType: compressedResponse.headers.get('Content-Type') || contentType
  }
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        provider: 'tinify'
      }
    },
    { status }
  )
}
