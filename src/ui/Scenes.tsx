import { useEffect, useState } from 'react'
import { useGame } from '../core/store'
import { audio } from '../core/audio'
import { STAT_LABELS } from '../core/types'
import type { StatKey } from '../core/types'
import { godById } from '../core/data/gods'
import { personalityById } from '../core/data/personalities'
import { TOMOSHIGATA, tozaOf } from '../core/data/toza'
import type { Tomoshigata } from '../core/types'
import { clearSave } from '../core/save'
import { downloadChronicleCard } from './shareCard'
import { gameImg } from './img'

export function BirthScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const processNextScene = useGame((s) => s.processNextScene)
  const char = data.family.find((c) => c.id === charId)
  useEffect(() => {
    audio.se('birth')
  }, [])
  if (!char) return null
  const god = godById(char.godParentId)
  const parent = data.family.find((c) => c.id === char.humanParentId)
  const p = personalityById(char.personalityId)

  return (
    <div className="scene-screen screen">
      <div className="birth-flame">🔥</div>
      <h1 className="scene-title">誕生</h1>
      <div className="scene-body">
        <p>
          {parent?.name}と{god.name}の子、生まれる。
        </p>
        <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.3em', margin: '18px 0' }}>
          {char.name}
        </p>
        <p style={{ color: 'var(--text-dim)' }}>
          第{char.gen}代 — {p.label}な子。{p.desc}
        </p>
        <div className="stat-grid" style={{ maxWidth: 360, margin: '14px auto' }}>
          {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
            <span key={k} className="stat-cell">
              <em>{STAT_LABELS[k]}</em>
              {char.potential[k]}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          与えられた命は八季(廿四月)。六月で成人し、隊に加われる。
        </p>
      </div>
      <button className="btn btn-main" onClick={processNextScene}>
        名を家譜に記す
      </button>
    </div>
  )
}

export function DeathScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const processNextScene = useGame((s) => s.processNextScene)
  const char = data.family.find((c) => c.id === charId)
  useEffect(() => {
    audio.se('death')
  }, [])
  if (!char) return null

  return (
    <div className="scene-screen screen">
      <div className="death-flame">🔥</div>
      <h1 className="scene-title">看取り</h1>
      <div className="scene-body">
        <p>
          {char.name}、第{char.gen}代。八つの季節を生き、灯が尽きた。
        </p>
        {char.deeds.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {char.deeds.join('。')}。討った魔性{char.kills}。
          </p>
        )}
        <div className="scene-epitaph">「{char.epitaph}」</div>
        <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
          綴「……よう生きた。あんたの八季、確かに書き留めたぞ」
        </p>
      </div>
      <button className="btn btn-main" onClick={processNextScene}>
        灯を、継ぐ
      </button>
    </div>
  )
}

// ライフイベント — 家族の人生の一場面(初陣・絆・灯細りの夜)
export function LifeScene({ title, lines, bg }: { title: string; lines: { speaker: string; text: string }[]; bg?: string }) {
  const processNextScene = useGame((s) => s.processNextScene)
  const [beat, setBeat] = useState(0)
  const done = beat >= lines.length - 1
  return (
    <div className="scene-screen screen" onClick={() => !done && setBeat(beat + 1)}>
      {bg && <img className="scene-bg" src={gameImg(bg)} alt="" aria-hidden />}
      <h1 className="scene-title">{title}</h1>
      <div className="scene-body" style={{ textAlign: 'left' }}>
        {lines.slice(0, beat + 1).map((l, i) => (
          <p key={i} className={i === beat ? 'intro-current' : 'intro-past'}>
            {l.speaker ? (
              <>
                <b style={{ color: 'var(--amber)' }}>{l.speaker}</b>
                <span style={{ color: 'var(--text-dim)' }}> — </span>
                {l.text}
              </>
            ) : (
              <span style={{ color: 'var(--text-dim)' }}>{l.text}</span>
            )}
          </p>
        ))}
      </div>
      {done ? (
        <button className="btn btn-main" onClick={processNextScene}>
          この夜を憶えておく
        </button>
      ) : (
        <div className="intro-hint">クリックで進む</div>
      )}
    </div>
  )
}

// 成人の儀 — 生後六月、灯型を授ける。血潮から推奨を示す
export function CeremonyScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const assignTomoshigata = useGame((s) => s.assignTomoshigata)
  const [chosen, setChosen] = useState<Tomoshigata | null>(null)
  const char = data.family.find((c) => c.id === charId)
  if (!char) return null
  const p = personalityById(char.personalityId)

  // 血潮による推奨灯型
  const rec: Tomoshigata =
    char.potential.mnd >= Math.max(char.potential.str, char.potential.vit, char.potential.agi)
      ? 'sumi'
      : char.potential.vit >= Math.max(char.potential.str, char.potential.agi)
        ? 'iwao'
        : char.potential.agi >= char.potential.str
          ? 'nagi'
          : 'homura'

  if (chosen) {
    const gataDef = TOMOSHIGATA.find((t) => t.id === chosen)!
    const toza = tozaOf(chosen, char.element)
    return (
      <div className="scene-screen screen">
        <img className="scene-bg" src={gameImg('cg_ceremony.png')} alt="" aria-hidden />
        <div className="birth-flame">🔥</div>
        <h1 className="scene-title">成人の儀</h1>
        <div className="scene-body">
          <p style={{ fontSize: 18, color: 'var(--amber)' }}>{gataDef.ritual}</p>
          <p style={{ margin: '18px 0' }}>
            {char.name}は灯を受け取り、静かに頷いた。
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.2em' }}>
            灯座「{toza.name}」— {toza.title}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 10 }}>
            初伝「{toza.skills[0].name}」を習得。灯は月齢とともに深まり、やがて奥義に至る。
          </p>
        </div>
        <button className="btn btn-main" onClick={() => assignTomoshigata(char.id, chosen)}>
          家譜に記す
        </button>
      </div>
    )
  }

  return (
    <div className="scene-screen screen">
      <h1 className="scene-title">成人の儀</h1>
      <div className="scene-body">
        <p>
          {char.name}(第{char.gen}代・{p.label})、生後六月。大燈籠の前に立ち、灯型を授かる時が来た。
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          灯型×星脈({char.element === 'fire' ? '火' : char.element === 'water' ? '水' : char.element === 'wind' ? '風' : char.element === 'earth' ? '土' : char.element === 'moon' ? '月' : '星'}
          の脈)で、この子だけの灯座が決まる。
        </p>
      </div>
      <div className="god-grid" style={{ maxWidth: 720, marginTop: 16 }}>
        {TOMOSHIGATA.map((t) => {
          const toza = tozaOf(t.id, char.element)
          return (
            <div key={t.id} className="god-card" onClick={() => setChosen(t.id)}>
              <div className="god-name">
                {t.label}({t.kana}){t.id === rec ? ' ★血潮の勧め' : ''}
              </div>
              <div className="god-person">→ 灯座「{toza.name}」{toza.title}</div>
              <div className="god-desc">{t.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const DREAM_BEATS = [
  '……唄が、聴こえる。',
  '夢の中。見知らぬ山の頂に、楽士がひとり座っている。黒い月を背に、琵琶を抱いて。',
  '「あら。夢を渡って来たのね。……血は争えないわ」',
  '彼女の顔は、家譜の最初の頁に描かれた似姿と同じだった。千年前の家祖——汐里。',
  '「名乗らなくていいの。あなたたちの名は、全部、風に聞いてる。産声も、辞世も、ぜんぶ」',
  '「山頂で待ってるわ。……ああ、でも、急がないで」',
  '「あなたたちの季節は短いのだから。道草も、お食べなさい。祭も、恋も、昼寝もね」',
  '「それでいつか、ここへ届いたら——そのときは」',
  '唄が途切れた。彼女は少しだけ笑って、囁いた。「……看取って、ちょうだいね」',
  '目が覚める。頬に涙の痕。綴は何も聞かず、黙って墨を磨っていた。',
]

export function DreamScene() {
  const processNextScene = useGame((s) => s.processNextScene)
  const [beat, setBeat] = useState(0)
  const done = beat >= DREAM_BEATS.length - 1
  return (
    <div className="scene-screen screen" onClick={() => !done && setBeat(beat + 1)}>
      <h1 className="scene-title">夢渡り</h1>
      <div className="scene-body">
        {DREAM_BEATS.slice(Math.max(0, beat - 2), beat + 1).map((t, i, arr) => (
          <p key={beat - arr.length + i} className={i === arr.length - 1 ? 'intro-current' : 'intro-past'}>
            {t}
          </p>
        ))}
      </div>
      {done ? (
        <button className="btn btn-main" onClick={processNextScene}>
          目を覚ます
        </button>
      ) : (
        <div className="intro-hint">クリックで進む</div>
      )}
    </div>
  )
}

const ENDING_CLEARED = [
  '御山の頂。玄冬の面が、割れて落ちる。',
  '現れたのは — 楽士の面影。千年、独りで星喰いを封じ続けた家祖、汐里。',
  '「……ああ、来てくれたのね。私の、遠い遠い子どもたち」',
  '刃を納め、当主は家譜を開く。千年分の名を、一人ずつ、読み上げていく。',
  '汐里は聴いている。子守唄を口ずさむように、頷きながら。',
  '最後の名が読まれたとき、星喰いは — 眠るように、消えた。',
  '「もう、いいのね。もう、休んでいいのね」',
  '大燈籠の火が、朝焼けの色に変わる。千年ぶりの太陽が、燈ノ郷に昇る。',
  'その春、燈守家に子が生まれた。八季で死なない、初めての子が。',
  '汝の屍を越え、灯は継がれた。',
  '— 完 —',
]

const ENDING_EXTINCT = [
  '最後の灯が、消えた。',
  '燈守家の血脈は、ここに絶えた。',
  '大燈籠の火は細り、常夜が郷を呑んでいく。',
  '……だが、家譜だけは残った。',
  '綴「いつか誰かが、この記を読む。ならばこれは敗北ではない。……中断だ」',
]

export function EndingScene() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const newLegacyGame = useGame((s) => s.newLegacyGame)
  const [beat, setBeat] = useState(0)
  const cleared = !!data.flags.cleared
  const beats = cleared ? ENDING_CLEARED : ENDING_EXTINCT
  const done = beat >= beats.length - 1

  const gens = Math.max(...data.family.map((c) => c.gen))
  const fallenCount = data.family.filter((c) => !c.alive).length
  const years = Math.floor(data.seasonIndex / 4) + 1

  return (
    <div className="scene-screen screen" onClick={() => !done && setBeat(beat + 1)}>
      <h1 className="scene-title">{cleared ? '灯継ぎ' : '断絶'}</h1>
      <div className="scene-body">
        {beats.slice(Math.max(0, beat - 2), beat + 1).map((t, i, arr) => (
          <p key={beat - arr.length + i} className={i === arr.length - 1 ? 'intro-current' : 'intro-past'}>
            {t}
          </p>
        ))}
      </div>
      {done && (
        <>
          <div className="ending-stats">
            紡がれた世代<b>{gens}</b>代 / 逝った者<b>{fallenCount}</b>人 / 費やした歳月<b>{years}</b>年
          </div>
          <button className="btn" onClick={() => downloadChronicleCard(data)}>
            この千年紀を一枚絵に残す(画像保存)
          </button>
          {cleared && (
            <button className="btn btn-main" onClick={() => newLegacyGame()}>
              新たな千年紀へ — 継承新周回(形見と血の濃さを持ち越す)
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!cleared) clearSave()
              setScreen({ id: 'title' })
            }}
          >
            題目へ戻る
          </button>
        </>
      )}
      {!done && <div className="intro-hint">クリックで進む</div>}
    </div>
  )
}
