import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { audio } from '../core/audio'
import {
  getReduceMotion, setReduceMotion, getAutoBattleDefault, setAutoBattleDefault,
  getAutoPolicySettings, setAutoPolicySettings, type AutoBattlePolicy,
} from '../core/settings'
import { Sheet } from './layout/shell'
import './settings_vc6.css'

// 設定 — 音量/ミュート/モーション軽減/オート戦闘既定。
// localStorage永続なので開くたびに現在値を読む。M22 §4: 共通Sheet契約(ESC/外側/フォーカス復帰/scroll lock)。
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [vol, setVol] = useState(Math.round(audio.volume * 100))
  const [musicVol, setMusicVol] = useState(Math.round(audio.musicVolume * 100))
  const [effectsVol, setEffectsVol] = useState(Math.round(audio.effectsVolume * 100))
  const [ambienceVol, setAmbienceVol] = useState(Math.round(audio.ambienceVolume * 100))
  const [muted, setMuted] = useState(audio.muted)
  const [calm, setCalm] = useState(audio.calm)
  const [reduceMotion, setRM] = useState(getReduceMotion())
  const [autoDefault, setAutoDef] = useState(getAutoBattleDefault())
  const [autoPolicy, setAutoPolicy] = useState(getAutoPolicySettings())
  const changePolicy = (policy: AutoBattlePolicy) => {
    const next = { ...autoPolicy, policy }
    setAutoPolicy(next)
    setAutoPolicySettings(next)
  }
  const toggleStop = (key: keyof typeof autoPolicy.stops) => {
    const next = { ...autoPolicy, stops: { ...autoPolicy.stops, [key]: !autoPolicy.stops[key] } }
    setAutoPolicy(next)
    setAutoPolicySettings(next)
  }
  const policyKeys: AutoBattlePolicy[] = ['steady', 'economy', 'allOut']
  const movePolicy = (event: ReactKeyboardEvent<HTMLButtonElement>, key: AutoBattlePolicy) => {
    const current = policyKeys.indexOf(key)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? policyKeys.length - 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (current - 1 + policyKeys.length) % policyKeys.length
          : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (current + 1) % policyKeys.length
            : -1
    if (nextIndex < 0) return
    event.preventDefault()
    changePolicy(policyKeys[nextIndex])
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[nextIndex]?.focus()
  }

  return (
    <Sheet title="道具箱 — 設定" onClose={onClose}>
      <div className="settings-modal settings-toolbox">
        <header className="settings-toolbox-head">
          <span className="settings-toolbox-mark" aria-hidden="true">具</span>
          <p>遊び方は変えず、音・動き・戦闘の始め方だけを手元に合わせる。</p>
        </header>

        <div className="settings-tool-grid">
          <fieldset className="settings-tool-group">
            <legend>音の加減</legend>
            <div className="settings-sound-now" aria-label={`今の調べ ${audio.currentTrackLabel}`}>
              <span>今の調べ</span><strong>{audio.currentTrackLabel}</strong>
            </div>
            <div className="setting-row">
              <label className="setting-label" htmlFor="setting-volume">全体</label>
              <input
                id="setting-volume" aria-label="全体音量"
                className="setting-slider" type="range" min={0} max={100} value={vol}
                onChange={(e) => { const v = Number(e.target.value); setVol(v); audio.setVolume(v / 100) }}
              />
              <output className="setting-val" htmlFor="setting-volume" aria-live="polite">{vol}</output>
            </div>

            <div className="settings-mix-grid">
              <div className="setting-row">
                <label className="setting-label" htmlFor="setting-music-volume">音楽</label>
                <input
                  id="setting-music-volume" aria-label="音楽の音量"
                  className="setting-slider" type="range" min={0} max={100} value={musicVol}
                  onChange={(e) => { const v = Number(e.target.value); setMusicVol(v); audio.setMusicVolume(v / 100) }}
                />
                <output className="setting-val" htmlFor="setting-music-volume" aria-live="polite">{musicVol}</output>
              </div>
              <div className="setting-row">
                <label className="setting-label" htmlFor="setting-effects-volume">効果音</label>
                <input
                  id="setting-effects-volume" aria-label="効果音の音量"
                  className="setting-slider" type="range" min={0} max={100} value={effectsVol}
                  onChange={(e) => { const v = Number(e.target.value); setEffectsVol(v); audio.setEffectsVolume(v / 100) }}
                />
                <output className="setting-val" htmlFor="setting-effects-volume" aria-live="polite">{effectsVol}</output>
              </div>
              <div className="setting-row">
                <label className="setting-label" htmlFor="setting-ambience-volume">環境音</label>
                <input
                  id="setting-ambience-volume" aria-label="環境音の音量"
                  className="setting-slider" type="range" min={0} max={100} value={ambienceVol}
                  onChange={(e) => { const v = Number(e.target.value); setAmbienceVol(v); audio.setAmbienceVolume(v / 100) }}
                />
                <output className="setting-val" htmlFor="setting-ambience-volume" aria-live="polite">{ambienceVol}</output>
              </div>
            </div>

            <button className={`setting-toggle ${muted ? 'on' : ''}`} aria-pressed={muted} onClick={() => setMuted(audio.toggleMute())}>
              <span className="setting-label">音を消す</span>
              <span className="toggle-state">{muted ? '消音中' : '鳴らす'}</span>
            </button>
            <button className={`setting-toggle ${calm ? 'on' : ''}`} aria-pressed={calm} onClick={() => setCalm(audio.toggleCalm())}>
              <span className="setting-label">音楽の起伏を控えめに</span>
              <span className="toggle-state">{calm ? '穏やか' : '物語的'}</span>
            </button>
            <p className="setting-hint">太鼓・高音・急な盛り上がりを抑える。危険や戦況は画面にも表示される。</p>
          </fieldset>

          <fieldset className="settings-tool-group">
            <legend>画面と戦闘</legend>
            <button className={`setting-toggle ${reduceMotion ? 'on' : ''}`} aria-pressed={reduceMotion} onClick={() => { const n = !reduceMotion; setRM(n); setReduceMotion(n) }}>
              <span className="setting-label">演出を控えめに</span>
              <span className="toggle-state">{reduceMotion ? '控えめ' : '通常'}</span>
            </button>
            <p className="setting-hint">画面のゆれ・明滅・移動演出を抑える。攻略情報は減らない。</p>

            <button className={`setting-toggle ${autoDefault ? 'on' : ''}`} aria-pressed={autoDefault} onClick={() => { const n = !autoDefault; setAutoDef(n); setAutoBattleDefault(n) }}>
              <span className="setting-label">戦闘を最初からオート</span>
              <span className="toggle-state">{autoDefault ? 'オート既定' : '手動から'}</span>
            </button>
            <p className="setting-hint">次の出立から、戦闘開始時の状態に反映する。</p>

            <div className="auto-policy-settings">
              <span className="setting-label">オートの方針</span>
              <div className="auto-policy-options" role="radiogroup" aria-label="オート戦闘の方針">
                {([
                  ['steady', '堅実', '回復と弱点を優先'],
                  ['economy', '温存', '灯力と道具を使わない'],
                  ['allOut', '全力', '技と弱点を優先'],
                ] as const).map(([key, label, hint]) => (
                  <button
                    key={key}
                    className={`btn auto-policy-option ${autoPolicy.policy === key ? 'is-on' : ''}`}
                    role="radio"
                    aria-checked={autoPolicy.policy === key}
                    tabIndex={autoPolicy.policy === key ? 0 : -1}
                    onKeyDown={(event) => movePolicy(event, key)}
                    onClick={() => changePolicy(key)}
                  >
                    <b>{label}</b><small>{hint}</small>
                  </button>
                ))}
              </div>
              <span className="setting-label">任意で止める場面</span>
              <div className="auto-stop-options">
                {([
                  ['hpDanger', '体力が危険'],
                  ['newDiscovery', '初めての魔性'],
                  ['rareEnemy', '稀相'],
                  ['boss', 'この地の主'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    className={`setting-toggle compact ${autoPolicy.stops[key] ? 'on' : ''}`}
                    aria-pressed={autoPolicy.stops[key]}
                    onClick={() => toggleStop(key)}
                  >
                    <span className="setting-label">{label}</span>
                    <span className="toggle-state">{autoPolicy.stops[key] ? '止める' : '続ける'}</span>
                  </button>
                ))}
              </div>
              <p className="setting-hint">停止条件は任意。初期状態では、新発見や主との戦いも止めずに進む。</p>
            </div>
          </fieldset>
        </div>

        <details className="settings-help">
          <summary>操作の手引き</summary>
          <dl>
            <div><dt>閉じる</dt><dd>画面外を押す / Escape</dd></div>
            <div><dt>項目移動</dt><dd>Tab / Shift + Tab</dd></div>
            <div><dt>決める</dt><dd>Enter / Space</dd></div>
          </dl>
        </details>
      </div>
    </Sheet>
  )
}
