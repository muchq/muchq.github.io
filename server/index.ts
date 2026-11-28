import { SOLO_API } from '../src/apps/wordchains/solo/contract.ts'
import { readSoloRequest } from './wordchains/service.ts'

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === SOLO_API) return readSoloRequest(request)
    return env.ASSETS.fetch(request)
  },
}
