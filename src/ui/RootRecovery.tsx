import { Component, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'
import { resetSettings } from '../core/settings'
import { buildDiagnosticId } from './root_diagnostic'
import './root_recovery.css'

function RecoveryScreen({ error }: { error: Error }) {
  const diagnosticId = useMemo(() => buildDiagnosticId(error), [error])
  const [notice, setNotice] = useState('')

  const copyDiagnostic = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticId)
      setNotice('診断IDをコピーした。')
    } catch {
      setNotice(`コピーできなかった。診断ID: ${diagnosticId}`)
    }
  }

  return (
    <main className="root-recovery" role="alert">
      <section className="root-recovery-card">
        <p className="root-recovery-kicker">灯継ぎ・復旧頁</p>
        <h1>画面を開けなかった。</h1>
        <p>端末の記は自動では消さない。まず控えを書き出し、再読込を試してください。</p>
        <div className="root-recovery-actions">
          <button className="btn btn-main" onClick={() => window.location.reload()}>再読込する</button>
          <button className="btn" onClick={() => {
            setNotice('セーブを検証している…')
            void import('../core/save').then(({ downloadSave }) => {
              setNotice(downloadSave() ? '検証済みの記を書き出した。' : '書き出せる正常な記が見つからなかった。')
            }).catch(() => setNotice('セーブ検証部を読み込めなかった。回線を確認してください。'))
          }}>
            検証済みセーブを書き出す
          </button>
          <button className="btn" onClick={() => {
            setNotice(resetSettings() ? '設定を初期化した。再読込してください。' : '保存領域を使えず、設定を初期化できなかった。')
          }}>
            設定だけ初期化する
          </button>
          <button className="btn btn-ghost" onClick={copyDiagnostic}>診断IDをコピー</button>
        </div>
        <p className="root-recovery-note">書出し時にmain/控えを検証し、正常な記だけを保存する。</p>
        {notice && <p className="root-recovery-notice" aria-live="polite">{notice}</p>}
        <code>{diagnosticId}</code>
      </section>
    </main>
  )
}

interface RootErrorBoundaryProps {
  children: ReactNode
}

interface RootErrorBoundaryState {
  error: Error | null
}

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('HITSUGI root render failure', buildDiagnosticId(error), error, info.componentStack)
  }

  render() {
    return this.state.error ? <RecoveryScreen error={this.state.error} /> : this.props.children
  }
}
