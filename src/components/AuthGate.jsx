import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function AuthGate() {
  const { t } = useTranslation()
  const [required, setRequired] = useState(false)
  const [authed, setAuthed] = useState(true)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await window.api.auth.isRequired()
        if (!cancelled && r && r.ok) {
          setRequired(!!r.required && !r.authed)
          setAuthed(!!r.authed || !r.required)
        }
      } catch (_) {}
    })()
    return () => { cancelled = true }
  }, [])

  if (!required || authed) return null

  const login = async () => {
    if (!password) return
    setBusy(true)
    setError('')
    try {
      const r = await window.api.auth.login(password, remember)
      if (r && r.ok && r.authed) {
        setAuthed(true)
      } else {
        setError('Invalid password')
      }
    } catch (_) {
      setError('Invalid password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-80 glass rounded-xl p-4 border border-white/10">
        <div className="text-sm font-semibold mb-2">{t('auth.title', { defaultValue: 'Enter password' })}</div>
        <input type="password" className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') login() }} />
        <div className="flex items-center gap-2 mt-3">
          <label className="flex items-center gap-2 text-xs opacity-80"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> {t('auth.remember', { defaultValue: 'Remember for 7 days' })}</label>
          <button onClick={login} disabled={busy || !password} className={`px-3 py-2 rounded ${busy || !password ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500'}`}>{busy ? '...' : t('auth.unlock', { defaultValue: 'Unlock' })}</button>
          {error && <div className="text-xs text-rose-400">{error}</div>}
        </div>
      </div>
    </div>
  )
}