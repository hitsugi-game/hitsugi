import { useEffect, useState } from 'react'
import { useGame } from '../core/store'
import { audio } from '../core/audio'
import { STAT_LABELS } from '../core/types'
import type { StatKey } from '../core/types'
import { godById, MOURNING } from '../core/data/gods'
import { personalityById } from '../core/data/personalities'
import { TOMOSHIGATA, tozaOf } from '../core/data/toza'
import type { Tomoshigata, JobClassId } from '../core/types'
import { JOB_CLASSES, JOB_ROLE_LABELS, JOB_SCHOOL_LABELS, recommendJob, jobById } from '../core/data/jobs'
import type { JobRole } from '../core/data/jobs'
import { skillById } from '../core/data/skills'
import { MALE_NAMES, FEMALE_NAMES } from '../core/data/names'
import { ENDINGS, FINALE_CHOICES } from '../core/data/story'
import { dreamEpisodeById } from '../core/data/dreams'
import { clearSave } from '../core/save'
import { downloadChronicleCard } from './shareCard'
import { MaybeImg, SceneBg } from './components'
import { gameImg } from './img'
import './m17_scenes.css'

// 章タイトル→cg_ch{n}.png の対応(CHAPTERSのtitleは固定文字列 — data/story.tsのid順と一致)
const CHAPTER_BG: Record<string, string> = {
  '第一章 常夜': 'cg_ch1.png',
  '第二章 主たちの無念': 'cg_ch2.png',
  '第三章 星喰いの影': 'cg_ch3.png',
  '第四章 楽士の秘密': 'cg_ch4.png',
  '第五章 頂へ': 'cg_ch5.png',
}

// 同じ場面(タイトル+台詞)なら常に同じ life_daily_*.png を引く簡易ハッシュ
function stableDailyIndex(title: string, lines: { speaker: string; text: string }[]): number {
  const s = title + lines.map((l) => l.speaker + l.text).join('')
  let sum = 0
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i)
  return sum % 20
}

// statBias上位2ステータス(灯型/家業カードの選択材料)
function topStatBias(bias: Partial<Record<StatKey, number>>): [StatKey, number][] {
  return (Object.entries(bias) as [StatKey, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
}
function StatBiasChips({ bias }: { bias: Partial<Record<StatKey, number>> }) {
  const top = topStatBias(bias)
  if (top.length === 0) return null
  return (
    <span className="card-bias">
      {top.map(([k, v]) => (
        <span key={k} className="bias-chip">{STAT_LABELS[k]}+{v}</span>
      ))}
    </span>
  )
}

// 誕生の兆し — 神の属性ごとに、生まれた刹那の星のしるしを彩る(bornSeasonで選ぶ)。
const BIRTH_OMENS: Record<string, string[]> = {
  fire: [
    '産声の刹那、郷の大燈籠がひときわ強く燃え上がったという。',
    '囲炉裏の火が、招くように子のほうへ揺れた。熱を宿す血の子だ。',
    '赤子の掌は、生まれながらに温かかった。灯を絶やさぬ者になろう。',
  ],
  water: [
    '生まれた子の頬に、どこからか雫がひとつ落ちた。星の涙か、恵みか。',
    '産湯はいらぬほど、その子は静かに濡れて生まれてきた。',
    '遠くの涸れ沢に、その夜だけ水音が戻ったと、年寄りは言う。',
  ],
  wind: [
    '夜藪を渡る風が、赤子の産声を遠くの峰まで運んでいった。',
    '窓もないのに、産屋の灯がふわりと一度だけ揺れた。風の子の証。',
    'その子が生まれた朝、郷に久方ぶりの涼風が吹いたという。',
  ],
  earth: [
    '踏みしめた郷の土が、ほんの少し温もった。根を張る者が来た。',
    '産声とともに、庭の枯れ石がひとつ、ことりと落ち着いた。',
    'その子の生まれた年は、痩せた畑にも実がよく成ったと伝わる。',
  ],
  moon: [
    '欠けた月が、雲間から一瞬だけ、その子を照らして去った。',
    '常夜のはずの空に、うっすらと月の輪郭が滲んだ夜だった。',
    '赤子は、闇のほうをじっと見て泣かなかった。夜目の子だ。',
  ],
  star: [
    '空のどこかで、名もなき星がひとつ、静かに瞬いたという。',
    '玄冬に喰われ残った星の光が、その子の額に一点、宿った気がした。',
    '産声の瞬間、夜藪の露がいっせいに、星の色に光ったと語られる。',
  ],
}
function birthOmen(element: string, bornSeason: number): string {
  const bank = BIRTH_OMENS[element] ?? BIRTH_OMENS.star
  return bank[Math.abs(bornSeason) % bank.length]
}

export function BirthScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const processNextScene = useGame((s) => s.processNextScene)
  const renameCharacter = useGame((s) => s.renameCharacter)
  const char = data.family.find((c) => c.id === charId)
  const [name, setName] = useState('')
  const [candidates, setCandidates] = useState<string[]>([])
  useEffect(() => {
    audio.se('birth')
  }, [])
  // 命名候補(生まれた子の性別プールから、家中で未使用の名を3つ)
  useEffect(() => {
    if (!char) return
    setName(char.name)
    const pool = char.sex === 'm' ? MALE_NAMES : FEMALE_NAMES
    const used = new Set(data.family.map((c) => c.name))
    const free = pool.filter((n) => !used.has(n))
    const picks: string[] = []
    for (let i = 0; i < free.length && picks.length < 3; i++) {
      const n = free[(i * 7 + char.bornSeason) % free.length]
      if (!picks.includes(n)) picks.push(n)
    }
    setCandidates(picks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charId])
  if (!char) return null
  const god = godById(char.godParentId)
  const parent = data.family.find((c) => c.id === char.humanParentId)
  const p = personalityById(char.personalityId)

  const confirm = () => {
    if (name.trim() && name.trim() !== char.name) renameCharacter(char.id, name)
    processNextScene()
  }

  return (
    <div className="scene-screen screen">
      <SceneBg file="cg2_birth.png" />
      <div className="birth-flame">🔥</div>
      <h1 className="scene-title">誕生</h1>
      <div className="scene-body">
        <p>
          {parent?.name}と{god.name}の子、生まれる。
        </p>
        <p className="birth-omen">{birthOmen(char.element, char.bornSeason)}</p>
        {/* 命名(v3.1 M16-2): 候補から選ぶか、自由に授ける */}
        <div className="naming-box">
          <input
            className="naming-input"
            value={name}
            maxLength={8}
            onChange={(e) => setName(e.target.value)}
            aria-label="子の名"
          />
          <div className="naming-candidates">
            {[char.name, ...candidates].filter((n, i, a) => a.indexOf(n) === i).slice(0, 4).map((n) => (
              <button key={n} className={`btn btn-ghost naming-pick ${name === n ? 'active' : ''}`} onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
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
      <button className="btn btn-main" onClick={confirm} disabled={!name.trim()}>
        名を家譜に記す
      </button>
    </div>
  )
}

export function DeathScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const processNextScene = useGame((s) => s.processNextScene)
  const setLastWords = useGame((s) => s.setLastWords)
  const char = data.family.find((c) => c.id === charId)
  const [beat, setBeat] = useState(0) // 生涯の巻物を一行ずつ手繰る(M15-2)
  const [words, setWords] = useState('')
  useEffect(() => {
    audio.se('death')
  }, [])
  // 生涯ダイジェスト(M15-2): この人の八季を、巻物のように振り返る
  const digest = (() => {
    if (!char) return []
    const lines: string[] = []
    const born = data.chronicle.find((e) => e.kind === 'birth' && e.charId === char.id)
    if (born) lines.push(born.text)
    if (char.expeditions > 0) lines.push(`夜藪への遠征、${char.expeditions}たび。`)
    if (char.kills > 0) lines.push(`討った魔性、${char.kills}。`)
    const children = data.family.filter((c) => c.humanParentId === char.id)
    if (children.length > 0) lines.push(`残した子、${children.length}人 — ${children.map((c) => c.name).join('、')}。`)
    for (const d of char.deeds.slice(0, 3)) lines.push(`${d}。`)
    return lines
  })()
  const digestDone = beat >= digest.length
  if (!char) return null

  const confirm = () => {
    if (words.trim()) setLastWords(char.id, words)
    processNextScene()
  }

  return (
    <div className="scene-screen screen" onClick={() => { if (!digestDone) { audio.se('page'); setBeat(beat + 1) } }}>
      <SceneBg file="cg2_mitori.png" />
      <div className="death-flame">🔥</div>
      <h1 className="scene-title">看取り</h1>
      <div className="scene-body">
        <p>
          {char.name}、第{char.gen}代。八つの季節を生き、灯が尽きた。
        </p>
        {digest.length > 0 && (
          <div className="life-scroll">
            {digest.slice(0, Math.max(1, beat)).map((l, i) => (
              <p key={i} className="life-scroll-line">{l}</p>
            ))}
            {!digestDone && <ScenePager page={Math.min(Math.max(1, beat) , digest.length)} total={digest.length} onNext={() => { audio.se('page'); setBeat(beat + 1) }} />}
          </div>
        )}
        {digestDone && (
          <div className="naming-box" onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>最期に、遺す言葉があれば(任意)</p>
            <input
              className="naming-input"
              style={{ fontSize: 16, letterSpacing: '0.1em' }}
              value={words}
              maxLength={40}
              placeholder="……"
              onChange={(e) => setWords(e.target.value)}
            />
          </div>
        )}
        <div className="scene-epitaph">「{char.epitaph}」</div>
        {MOURNING[char.godParentId] && (
          <div style={{ margin: '4px 0 16px', padding: '10px 14px', borderLeft: '3px solid var(--el-star)', textAlign: 'left' }}>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
              星より、文が届いている — {godById(char.godParentId).name}
            </p>
            <p style={{ fontSize: 14, color: 'var(--el-star)' }}>{MOURNING[char.godParentId]}</p>
          </div>
        )}
        <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
          綴「……よう生きた。あんたの八季、確かに書き留めたぞ」
        </p>
      </div>
      <button className="btn btn-main" onClick={(e) => { e.stopPropagation(); confirm() }} disabled={!digestDone}>
        灯を、継ぐ
      </button>
    </div>
  )
}

// ライフイベント — 家族の人生の一場面(初陣・絆・灯細りの夜・本編の章・日常)
// bgが payload から来ていれば最優先(初陣=cg_hatsujin/灯細り=cg_hosori)。
// 章語りは bg 無しで来るため title(固定文字列)から cg_ch{n}.png を引く。
// それ以外(絆・日常)は bg 無しなので、場面文からの安定ハッシュで life_daily_* を割り当てる。
export function LifeScene({ title, lines, bg }: { title: string; lines: { speaker: string; text: string }[]; bg?: string }) {
  const processNextScene = useGame((s) => s.processNextScene)
  const [beat, setBeat] = useState(0)
  const done = beat >= lines.length - 1
  // SceneBg はファイル名(拡張子付き)を受け取り内部でgameImg()解決するため、
  // dailyIndexは素のファイル名(life_daily_NN.png)として組み立てる(dailyImg()は使わない)。
  const resolvedBg = bg ?? CHAPTER_BG[title] ?? `life_daily_${String(stableDailyIndex(title, lines)).padStart(2, '0')}.png`
  return (
    <div className="scene-screen screen" onClick={() => { if (!done) { audio.se('page'); setBeat(beat + 1) } }}>
      <SceneBg file={resolvedBg} />
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
        <ScenePager page={beat + 1} total={lines.length} onNext={() => { audio.se('page'); setBeat(beat + 1) }} />
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
        <SceneBg file="cg2_seijin.png" />
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
            <div key={t.id} className={`god-card ${t.id === rec ? 'recommended' : ''}`} onClick={() => setChosen(t.id)}>
              <MaybeImg src={gameImg(`emb_${t.id}_${char.element}.png`)} className="card-emblem" />
              <div className="god-name">
                {t.label}({t.kana}){t.id === rec ? ' ★血潮の勧め' : ''}
              </div>
              <div className="god-person">→ 灯座「{toza.name}」{toza.title}</div>
              <StatBiasChips bias={t.statBias} />
              <div className="god-desc">{t.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 生業の儀 — 生後十二月、郷の生業から家業を選ぶ(GDD_v3 §2)
// 灯座=星から継いだ「術」、家業=郷で修める「技」。二段目の成人。
export function JobRiteScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const assignJobClass = useGame((s) => s.assignJobClass)
  const [chosen, setChosen] = useState<JobClassId | null>(null)
  const char = data.family.find((c) => c.id === charId)
  if (!char) return null

  const rec = recommendJob(char.potential)
  const roles: JobRole[] = ['atk', 'tank', 'swift', 'heal', 'hex', 'sup']

  if (chosen) {
    const job = jobById(chosen)
    return (
      <div className="scene-screen screen">
        <SceneBg file="cg2_nariwai.png" />
        <div className="birth-flame">🔥</div>
        <h1 className="scene-title">生業の儀</h1>
        <div className="scene-body">
          <p style={{ fontSize: 18, color: 'var(--amber)' }}>{job.ritual}</p>
          <p style={{ margin: '18px 0' }}>
            {char.name}は道具を受け取り、深く頭を下げた。今日から{job.name}の見習いである。
          </p>
          <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.2em' }}>
            家業「{job.name}」— {JOB_SCHOOL_LABELS[job.school]}の{JOB_ROLE_LABELS[job.role]}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 10 }}>
            初伝「{skillById(job.skillIds[0]).name}」を習得。技は年季とともに深まり、八段の奥伝に至る。
          </p>
        </div>
        <button className="btn btn-main" onClick={() => assignJobClass(char.id, chosen)}>
          家譜に記す
        </button>
      </div>
    )
  }

  return (
    <div className="scene-screen screen">
      <h1 className="scene-title">生業の儀</h1>
      <div className="scene-body">
        <p>
          {char.name}(第{char.gen}代)、生後十二月。郷の親方衆が居並ぶ前で、家業を選ぶ時が来た。
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          灯座は星から継いだ術、家業は郷で修める技。夜藪の外にも、この子の生きる場所ができる。
        </p>
      </div>
      <div style={{ maxWidth: 860, width: '100%', textAlign: 'left', maxHeight: '52vh', overflowY: 'auto', padding: '0 4px' }}>
        {roles.map((role) => (
          <div key={role} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--gold)', letterSpacing: '0.3em', margin: '8px 0 6px' }}>
              {JOB_ROLE_LABELS[role]}の生業{role === rec ? ' ★血潮の勧め' : ''}
            </div>
            <div className="god-grid">
              {JOB_CLASSES.filter((j) => j.role === role).map((j) => (
                <div key={j.id} className={`god-card ${role === rec ? 'recommended' : ''}`} onClick={() => setChosen(j.id)}>
                  <MaybeImg src={gameImg(`job_${j.id}.png`)} className="card-emblem" />
                  <div className="god-name">
                    {j.name}({j.kana}){role === rec ? ' ★' : ''}
                  </div>
                  <div className="god-person">{JOB_SCHOOL_LABELS[j.school]} / {JOB_ROLE_LABELS[j.role]}</div>
                  <StatBiasChips bias={j.statBias} />
                  <div className="god-desc">{j.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
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

// M19 A4: 頁印+明示的「次へ」— 画面全体クリック進行は維持しつつ、確実な操作面を下部に置く。
// stopPropagationで背景クリックと二重発火しない。選択UI表示後は各シーンのguard(!done)が背景進行を止める。
function ScenePager({ page, total, onNext }: { page: number; total: number; onNext: () => void }) {
  return (
    <div className="scene-pager" onClick={(e) => e.stopPropagation()}>
      <span className="scene-page-mark">頁 {page}／{total}</span>
      <button className="btn scene-next" onClick={onNext}>次へ ▸</button>
    </div>
  )
}

export function DreamScene() {
  const processNextScene = useGame((s) => s.processNextScene)
  const [beat, setBeat] = useState(0)
  const done = beat >= DREAM_BEATS.length - 1
  return (
    <div className="scene-screen screen" onClick={() => { if (!done) { audio.se('page'); setBeat(beat + 1) } }}>
      <SceneBg file="cg_kiro.png" />
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
        <ScenePager page={beat + 1} total={DREAM_BEATS.length} onNext={() => { audio.se('page'); setBeat(beat + 1) }} />
      )}
    </div>
  )
}

// 夢渡りの連作(data/dreams.ts) — 看取りの数だけ深く見る、千年前の記憶。
// 様式は初回DreamSceneと同一(cg_kiro背景・朗読形式)。epIdが変われば読み進みをリセット。
export function DreamEpScene({ epId }: { epId: string }) {
  const processNextScene = useGame((s) => s.processNextScene)
  const [beat, setBeat] = useState(0)
  const [lastEp, setLastEp] = useState(epId)
  if (epId !== lastEp) {
    setLastEp(epId)
    setBeat(0)
  }
  const ep = dreamEpisodeById(epId)
  if (!ep) {
    // 未知のepId(将来のセーブ互換等) — 詰まらせず静かに次へ
    processNextScene()
    return null
  }
  const done = beat >= ep.beats.length - 1
  return (
    <div className="scene-screen screen" onClick={() => { if (!done) { audio.se('page'); setBeat(beat + 1) } }}>
      <SceneBg file="cg_kiro.png" />
      <h1 className="scene-title">{ep.title}</h1>
      <div className="scene-body">
        {ep.beats.slice(Math.max(0, beat - 2), beat + 1).map((t, i, arr) => (
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
        <ScenePager page={beat + 1} total={ep.beats.length} onNext={() => { audio.se('page'); setBeat(beat + 1) }} />
      )}
    </div>
  )
}

// cut(斬る=夜明け)の後日談。クライマックス(ENDINGS.cut.beats=看取り・面砕け)と重複させず、
// その「あと」だけを描く — 夜が明け、太陽が昇り、八季で死なぬ子が生まれ、家譜が閉じられる。
const ENDING_CLEARED = [
  '夜が、明けてゆく。最初の朝日が大燈籠の天辺に触れ、郷中の灯が一斉に消えた——もう、要らないから。',
  '細っていた大燈籠の火は、朝焼けの色に染まった。千年ぶりの太陽が、燈ノ郷に昇る。',
  'その春、燈守家に子が生まれた。八季では死なない、初めての子が。',
  '一族の家譜の、最後の頁に、こう記された。「我ら、夜を継ぎ、朝を残す」',
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

// v3.2 M18: 結末別エピローグ。cut(斬る=夜明け)は ENDING_CLEARED を流用。
// save(救う)/inherit(継ぐ)は「夜は残る」帰結のため、太陽・夜明けを断言しない専用の結びを用意する。
const ENDING_SAVE = [
  '当主は家譜を開き、千年分の名を、汐里と二人で読み上げていく。',
  '一つ、また一つ。産声と、辞世と。汐里は初めて、独りでなくその名を聴いた。',
  '「……ぜんぶ、憶えてる。あなたたちのこと、ぜんぶ」汐里は泣いて、そして、笑った。',
  '夜は、明けない。それでも大燈籠の火は、もう二度と消えぬだろう。支え合う錠前が、二つになったのだから。',
  '汝の屍を越え、灯は継がれた。次は誰が、あの頂の隣に、座るのだろうか。',
  '— 完 —',
]

const ENDING_INHERIT = [
  '山を降りた汐里は、綴の隣で、家譜の続きを綴る側になった。今度は、頂に座る者を、憶えておくために。',
  '綴は筆を渡しながら言った。「錠前は代わる。だが家譜は続く。名を書き継ぐ者がいる限り、頂の誰も、独りにはならん」',
  '汐里はときおり、頂へ文を送る。産声を、祭を、恋を、昼寝を——山の下の、短くて眩しい日々を。',
  '夜は、明けない。だが頂の座は、もう永遠の牢ではない。八季ごとに、次の灯が、交代しに登ってゆく。',
  '汝の屍を越え、灯は継がれた。頂へ、頂へと。今度は、誰も独りにはさせずに。',
  '— 完 —',
]

// 最終決戦後の選択(v3.1 M15-4) — 千年の結末を、一族が選ぶ
export function FinaleScene() {
  const resolveFinale = useGame((s) => s.resolveFinale)
  return (
    <div className="scene-screen screen">
      <SceneBg file="cg_kiro.png" />
      <div className="birth-flame">🔥</div>
      <h1 className="scene-title">千年の岐路</h1>
      <div className="scene-body">
        <p>汐里は楽を置き、静かにこちらを見ている。</p>
        <p>「……ここから先は、生きている者が決めることよ」</p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 10 }}>この選択が、一族の千年の答えになる。</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460, margin: '0 auto' }}>
        {FINALE_CHOICES.map((c, i) => (
          <button key={c.id} className="btn" style={{ textAlign: 'left' }} onClick={() => resolveFinale(i)}>
            <b>{c.label}</b>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)' }}>{c.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function EndingScene() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const newLegacyGame = useGame((s) => s.newLegacyGame)
  const [beat, setBeat] = useState(0)
  const cleared = !!data.flags.cleared
  // v3.1 M15-4: 最終選択に応じた結末分岐(選択がなければ従来の夜明け)
  const endType = (typeof data.flags.endingType === 'number'
    ? (['cut', 'save', 'inherit'] as const)[data.flags.endingType]
    : 'cut')
  const climaxBeats = ENDINGS[endType].beats
  // v3.2 M18: 結末別エピローグ。cut=夜明け(ENDING_CLEARED)、save/inherit=夜が残る帰結へ整合。
  const epilogue = endType === 'save' ? ENDING_SAVE : endType === 'inherit' ? ENDING_INHERIT : ENDING_CLEARED
  const beats = cleared ? [...climaxBeats, ...epilogue] : ENDING_EXTINCT
  const done = beat >= beats.length - 1
  // 山場(cut/save/inherit別)→_a、その後の共通エピローグ(ENDING_CLEARED)→_b。断絶(未clear)は画無し。
  const endingBg = cleared ? (beat < climaxBeats.length ? `cg_end_${endType}_a.png` : `cg_end_${endType}_b.png`) : null

  const gens = Math.max(...data.family.map((c) => c.gen))
  const fallenCount = data.family.filter((c) => !c.alive).length
  const years = Math.floor(data.seasonIndex / 4) + 1

  return (
    <div className="scene-screen screen" onClick={() => { if (!done) { audio.se('page'); setBeat(beat + 1) } }}>
      {endingBg && <SceneBg file={endingBg} />}
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
      {!done && <ScenePager page={beat + 1} total={beats.length} onNext={() => { audio.se('page'); setBeat(beat + 1) }} />}
    </div>
  )
}
