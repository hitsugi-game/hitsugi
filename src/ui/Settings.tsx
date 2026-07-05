import { useState } from 'react'
import { audio } from '../core/audio'
import { getReduceMotion, setReduceMotion, getAutoBattleDefault, setAutoBattleDefault } from '../core/settings'

// 設定モーダル — 音量/ミュート/モーション軽減/オート戦闘既定。
// localStorage永続なので開くたびに現在値を読む。onClose で閉じる。
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [vol, setVol] = useState(Math.round(audio.volume * 100))
  const [muted, setMuted] = useState(audio.muted)
  const [reduceMotion, setRM] = useState(getReduceMotion())
  const [autoDefault, setAutoDef] = useState(getAutoBattleDefault())

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">設定</h2>

        <div className="setting-row">
          <label className="setting-label">音量</label>
          <input
            className="setting-slider" type="range" min={0} max={100} value={vol}
            onChange={(e) => { const v = Number(e.target.value); setVol(v); audio.setVolume(v / 100) }}
          />
          <span className="setting-val">{vol}</span>
        </div>

        <button className={`setting-toggle ${muted ? 'on' : ''}`} onClick={() => setMuted(audio.toggleMute())}>
          <span className="setting-label">音を消す</span>
          <span className="toggle-state">{muted ? '消音中' : '鳴らす'}</span>
        </button>

        <button className={`setting-toggle ${reduceMotion ? 'on' : ''}`} onClick={() => { const n = !reduceMotion; setRM(n); setReduceMotion(n) }}>
          <span className="setting-label">演出を控えめに</span>
          <span className="toggle-state">{reduceMotion ? '控えめ' : '通常'}</span>
        </button>
        <p className="setting-hint">画面のゆれ・明滅・アニメを抑えます。乗り物酔いや光過敏の方へ。</p>

        <button className={`setting-toggle ${autoDefault ? 'on' : ''}`} onClick={() => { const n = !autoDefault; setAutoDef(n); setAutoBattleDefault(n) }}>
          <span className="setting-label">戦闘を最初からオート</span>
          <span className="toggle-state">{autoDefault ? 'オート既定' : '手動から'}</span>
        </button>
        <p className="setting-hint">出立するたびオート戦闘を自動でONにします。</p>

        <button className="btn btn-main" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}
