import { useEffect, useState } from 'react'

export default function AboutReadme() {
  const [md, setMd] = useState('')
  useEffect(() => {
    let alive = true
    window.api.getReadme().then(r => {
      if (!alive) return
      if (r && r.ok && r.data) setMd(r.data)
      else setMd('README not found')
    }).catch(()=>setMd('README not found'))
    return () => { alive = false }
  }, [])
  return (
    <pre className="w-full h-[560px] bg-slate-900 border border-white/10 rounded p-3 text-xs whitespace-pre-wrap overflow-auto">
      {md}
    </pre>
  )
}