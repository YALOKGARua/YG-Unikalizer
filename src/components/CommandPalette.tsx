import * as React from 'react'
import { Command } from 'cmdk'

type CommandItem = { id: string; label: string; action: () => void; keywords?: string[] }

export default function CommandPalette({ open, setOpen, items }: { open: boolean; setOpen: (v: boolean) => void; items: CommandItem[] }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className={open ? 'fixed inset-0 z-50 flex items-start justify-center p-4' : 'hidden'} onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div ref={ref} className="relative w-full max-w-xl rounded-lg overflow-hidden border border-white/10 bg-slate-900" onClick={e=>e.stopPropagation()}>
        <Command label="Command" className="w-full">
          <div className="border-b border-white/10 p-2">
            <Command.Input placeholder="Type a command or search..." className="w-full bg-transparent outline-none text-sm px-2 py-1" autoFocus />
          </div>
          <Command.List className="max-h-80 overflow-auto p-1">
            <Command.Empty className="p-2 text-xs opacity-60">No results</Command.Empty>
            {items.map(it => (
              <Command.Item key={it.id} value={it.label + ' ' + (it.keywords||[]).join(' ')} onSelect={() => { setOpen(false); it.action() }} className="px-2 py-1.5 text-sm rounded hover:bg-white/5 cursor-pointer">
                {it.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}