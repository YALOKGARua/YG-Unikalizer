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
    const wasm: any = await initWasm()
    if (!wasm || !wasm.memory || !wasm.aHashGray) return null
    const mem = new Uint8Array(wasm.memory.buffer)
    const len = width * height
    const ptr = wasm.__new ? wasm.__new(len, 0) : 0
    if (!ptr) return null
    mem.set(grayBytes, ptr)
    const v = wasm.aHashGray(ptr, width, height)
    return typeof v === 'bigint' ? v.toString(16) : v.toString(16)
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