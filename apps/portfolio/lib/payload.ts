import { getPayload } from 'payload'
import config from '../payload.config'

/**
 * Global cache for the Payload instance to avoid re-initializing 
 * on every request during a single execution context.
 */
let cachedPayload: any = (global as any).payload

if (!cachedPayload) {
  cachedPayload = (global as any).payload = { client: null, promise: null }
}

export const getPayloadClient = async () => {
  if (cachedPayload.client) {
    return cachedPayload.client
  }

  if (!cachedPayload.promise) {
    cachedPayload.promise = getPayload({
      config,
    })
  }

  try {
    cachedPayload.client = await cachedPayload.promise
  } catch (e) {
    cachedPayload.promise = null
    console.error('Failed to initialize Payload:', e)
    // If we are in a build environment and the DB is unreachable, 
    // we return a "safe" mock or re-throw depending on the context.
    // For now, we throw so the caller knows, but the layout/pages should handle this.
    throw e
  }

  return cachedPayload.client
}
