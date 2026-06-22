interface PagesContext {
  env: {
    TINIFY_API_KEY?: string
    ACTIVITY_CMS_PSD_TINIFY_KEY?: string
  }
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  return Response.json({
    ok: true,
    tinifyConfigured: Boolean(context.env.TINIFY_API_KEY || context.env.ACTIVITY_CMS_PSD_TINIFY_KEY)
  })
}
