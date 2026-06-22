import type { PsdApi } from '../../preload'

declare global {
  interface Window {
    psdApp?: PsdApi
  }
}
