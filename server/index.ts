import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import dotenv from 'dotenv'
import Fastify from 'fastify'

dotenv.config()

const host = process.env.SERVER_HOST || '127.0.0.1'
const port = Number(process.env.SERVER_PORT || 8787)
const tinifyApiKey = process.env.TINIFY_API_KEY || process.env.ACTIVITY_CMS_PSD_TINIFY_KEY
const maxImageBytes = Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024)
const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

const app = Fastify({
  logger: true,
  bodyLimit: maxImageBytes + 1024 * 1024
})

await app.register(cors, {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true)
      return
    }
    const configured = (process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    callback(null, configured.includes(origin))
  },
  methods: ['GET', 'POST', 'OPTIONS']
})

await app.register(multipart, {
  limits: {
    fileSize: maxImageBytes,
    files: 1
  }
})

app.get('/api/health', async () => ({
  ok: true,
  tinifyConfigured: Boolean(tinifyApiKey)
}))

app.post('/api/compress', async (request, reply) => {
  if (!tinifyApiKey) {
    return reply.code(500).send({
      error: {
        code: 'TINIFY_API_KEY_MISSING',
        message: 'TINIFY_API_KEY is not configured',
        provider: 'tinify'
      }
    })
  }

  const file = await request.file()
  if (!file) {
    return reply.code(400).send({
      error: {
        code: 'FILE_MISSING',
        message: 'multipart field "file" is required',
        provider: 'tinify'
      }
    })
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    return reply.code(415).send({
      error: {
        code: 'UNSUPPORTED_IMAGE_TYPE',
        message: `unsupported image type: ${file.mimetype}`,
        provider: 'tinify'
      }
    })
  }

  const input = await file.toBuffer()
  if (input.length > maxImageBytes) {
    return reply.code(413).send({
      error: {
        code: 'IMAGE_TOO_LARGE',
        message: `image is larger than ${maxImageBytes} bytes`,
        provider: 'tinify'
      }
    })
  }

  try {
    const compressed = await compressWithTinify(input, file.mimetype, tinifyApiKey)
    const savedBytes = Math.max(0, input.length - compressed.bytes.length)
    const savedPercent = input.length ? Number(((savedBytes / input.length) * 100).toFixed(2)) : 0

    reply
      .header('Content-Type', compressed.contentType || file.mimetype)
      .header('Cache-Control', 'no-store')
      .header('X-Compression-Provider', 'tinify')
      .header('X-Original-Bytes', String(input.length))
      .header('X-Compressed-Bytes', String(compressed.bytes.length))
      .header('X-Saved-Bytes', String(savedBytes))
      .header('X-Saved-Percent', String(savedPercent))

    return reply.send(compressed.bytes)
  } catch (error) {
    request.log.warn({ err: error }, 'Tinify compression failed')
    return reply.code(502).send({
      error: {
        code: 'TINIFY_FAILED',
        message: error instanceof Error ? error.message : String(error),
        provider: 'tinify'
      }
    })
  }
})

async function compressWithTinify(input: Buffer, contentType: string, apiKey: string) {
  const auth = Buffer.from(`api:${apiKey}`).toString('base64')
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
    bytes: Buffer.from(await compressedResponse.arrayBuffer()),
    contentType: compressedResponse.headers.get('Content-Type') || contentType
  }
}

app.listen({ host, port }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})
