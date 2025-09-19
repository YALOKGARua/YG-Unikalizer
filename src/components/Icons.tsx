import { Icon as IconifyIcon } from '@iconify/react'

export const IconPlus = (props: any) => (
  <IconifyIcon icon="mdi:plus" {...props} />
)

export const IconFolderOpen = (props: any) => (
  <IconifyIcon icon="mdi:folder-open" {...props} />
)

export const IconFolder = (props: any) => (
  <IconifyIcon icon="mdi:folder-multiple-outline" {...props} />
)

export const IconTrash = (props: any) => (
  <IconifyIcon icon="mdi:trash-can-outline" {...props} />
)

export const IconPlay = (props: any) => (
  <IconifyIcon icon="mdi:play-circle-outline" {...props} />
)

export const IconStop = (props: any) => (
  <IconifyIcon icon="mdi:stop" {...props} />
)

export const IconOpenExternal = (props: any) => (
  <IconifyIcon icon="mdi:folder-open-outline" {...props} />
)

export const IconInfo = (props: any) => (
  <IconifyIcon icon="mdi:information-outline" {...props} />
)

export const IconShield = (props: any) => (
  <IconifyIcon icon="mdi:shield-outline" {...props} />
)

export const IconStar = (props: any) => (
  <IconifyIcon icon="mdi:star-outline" {...props} />
)

export const IconEye = (props: any) => (
  <IconifyIcon icon="mdi:eye-outline" {...props} />
)

export const IconDownload = (props: any) => (
  <IconifyIcon icon="mdi:download" {...props} />
)

export const IconFile = (props: any) => (
  <IconifyIcon icon="mdi:file-outline" {...props} />
)

export const IconX = (props: any) => (
  <IconifyIcon icon="mdi:close" {...props} />
)

export const IconCheck = (props: any) => (
  <IconifyIcon icon="mdi:checkbox-marked-outline" {...props} />
)

export async function initWasm() {
  try {
    const res = await fetch('/wasm/pu.wasm')
    const buf = await res.arrayBuffer()
    const { instance } = await WebAssembly.instantiate(buf, {}) as any
    return instance && instance.exports ? instance.exports : null
  } catch (_) {
    return null
  }
}

export async function wasmAhashFromGray(grayBytes: Uint8Array, width: number, height: number) {
  try {
    if (typeof Worker === 'undefined') return null
    const worker = new Worker(new URL('../workers/hashWorker.ts', import.meta.url), { type: 'module' }) as any
    const id = Math.random().toString(36).slice(2)
    return await new Promise<string|null>((resolve) => {
      const onMsg = (e: MessageEvent) => {
        const d = e.data || {}
        if (d.id !== id) return
        worker.removeEventListener('message', onMsg)
        try { worker.terminate() } catch {}
        resolve(d && d.ok ? String(d.hash||'') : null)
      }
      worker.addEventListener('message', onMsg)
      worker.postMessage({ type: 'ahash-gray', id, gray: grayBytes, width, height })
    })
  } catch (_) { return null }
}

export const Icon = ({ name, ...props }: { name?: string } & any) => {
  if (name) return <IconifyIcon icon={name} {...props} />
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" fill="currentColor" opacity="0.1" />
    </svg>
  )
}