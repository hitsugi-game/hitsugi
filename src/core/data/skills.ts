import type { Skill } from '../types'

// 技 — 基本技(属性別)+補助+星神奥義(継承可)
export const SKILLS: Skill[] = [
  // ---- 基本攻撃技 ----
  { id: 'homura_giri', name: '火群斬り', type: 'attack', target: 'enemy', element: 'fire', power: 135, mpCost: 4, inheritable: false, desc: '刃に灯を移して斬る。夜の獣は火を厭う。' },
  { id: 'mikagami', name: '水鏡突き', type: 'attack', target: 'enemy', element: 'water', power: 135, mpCost: 4, inheritable: false, desc: '水面の如く静かに、一点を穿つ。' },
  { id: 'kazenagi', name: '風凪一閃', type: 'attack', target: 'enemy', element: 'wind', power: 135, mpCost: 4, inheritable: false, desc: '風が凪いだ一瞬に振り抜く居合。' },
  { id: 'iwatoshi', name: '岩通し', type: 'attack', target: 'enemy', element: 'earth', power: 135, mpCost: 4, inheritable: false, desc: '大地の重みを乗せた一撃。' },
  { id: 'tsukikage', name: '月影の針', type: 'attack', target: 'enemy', element: 'moon', power: 135, mpCost: 4, inheritable: false, desc: '影から影へ、月光の針を放つ。' },
  { id: 'hoshiugachi', name: '星穿ち', type: 'attack', target: 'enemy', element: 'star', power: 135, mpCost: 4, inheritable: false, desc: '流れ星の速さで急所を穿つ。' },
  { id: 'enbu', name: '焔群舞', type: 'attack', target: 'enemies', element: 'fire', power: 100, mpCost: 9, inheritable: false, desc: '篝火を撒き散らし敵陣を焼く。' },
  { id: 'senran', name: '旋嵐', type: 'attack', target: 'enemies', element: 'wind', power: 100, mpCost: 9, inheritable: false, desc: '竜巻を呼び敵をまとめて薙ぐ。' },

  // ---- 回復・補助 ----
  { id: 'koyashi', name: '小癒しの灯', type: 'heal', target: 'ally', power: 130, mpCost: 5, inheritable: false, desc: '掌の灯で傷口を温める。' },
  { id: 'ooinori', name: '大灯の祈り', type: 'heal', target: 'allies', power: 85, mpCost: 12, inheritable: false, desc: '大燈籠へ祈り、一族全員の傷を癒す。' },
  { id: 'kien', name: '気焔', type: 'buff', target: 'allies', power: 30, mpCost: 8, inheritable: false, desc: '雄叫びで一族の闘志に火を点ける。攻撃上昇。' },
  { id: 'himamori', name: '灯護り', type: 'buff', target: 'allies', power: 30, mpCost: 8, inheritable: false, desc: '灯の結界で身を包む。防御上昇。' },
  { id: 'kokorooshi', name: '心折りの囁き', type: 'debuff', target: 'enemies', power: 25, mpCost: 7, inheritable: false, desc: '夜の言葉で敵の戦意を挫く。攻撃低下。' },

  // ---- 星神奥義(継承の証) ----
  { id: 'g_tachinui', name: '風織・断ち縫い', type: 'attack', target: 'enemy', element: 'wind', power: 230, mpCost: 14, inheritable: true, desc: '織姫野分の奥義。風の糸で敵を縫い止め断つ。' },
  { id: 'g_fundogeki', name: '大熊憤怒撃', type: 'attack', target: 'enemy', element: 'earth', power: 250, mpCost: 16, inheritable: true, desc: '大熊星辰の奥義。星ごと殴る勢いの剛腕。' },
  { id: 'g_miobiki', name: '千鳥の澪引き', type: 'heal', target: 'allies', power: 140, mpCost: 16, inheritable: true, desc: '澪標千鳥の奥義。癒しの潮が一族を包む。' },
  { id: 'g_ryougen', name: '篝火燎原', type: 'attack', target: 'enemies', element: 'fire', power: 150, mpCost: 15, inheritable: true, desc: '篝火乙女の奥義。恋心と同じで燃え広がる。' },
  { id: 'g_shibariito', name: '千糸絡繰', type: 'debuff', target: 'enemies', power: 40, mpCost: 12, inheritable: true, desc: '宵蜘蛛御前の奥義。見えぬ糸が敵の力を封じる。' },
  { id: 'g_iwakura', name: '磐座の構え', type: 'buff', target: 'allies', power: 45, mpCost: 12, inheritable: true, desc: '石臼翁の奥義。山の如く動かぬ守り。' },
  { id: 'g_tsubame', name: '燕返し', type: 'attack', target: 'enemy', element: 'wind', power: 195, mpCost: 11, inheritable: true, desc: '燕颪の奥義。振り向いた時には終わっている。' },
  { id: 'g_yukiakatsuki', name: '雪暁の経', type: 'attack', target: 'enemies', element: 'water', power: 135, mpCost: 13, inheritable: true, desc: '雪安居の奥義。無音の吹雪が読経とともに降る。' },
  { id: 'g_yakumo', name: '八雲雷舞', type: 'attack', target: 'enemies', element: 'star', power: 150, mpCost: 15, inheritable: true, desc: '鳴神太鼓の奥義。雷鳴の乱れ打ちは祭囃子。' },
  { id: 'g_hiyaku', name: '月裏の秘薬', type: 'heal', target: 'ally', power: 260, mpCost: 13, inheritable: true, desc: '月裏兎の奥義。よく効くがとても苦い。' },
  { id: 'g_kamifubuki', name: '紙吹雪の帳', type: 'debuff', target: 'enemies', power: 35, mpCost: 11, inheritable: true, desc: '紙魚姫の奥義。千の紙片が敵の目を眩ます。' },
  { id: 'g_hokushin', name: '北辰一閃', type: 'attack', target: 'enemy', element: 'star', power: 320, mpCost: 20, inheritable: true, desc: '北辰老の奥義。北極星より真っ直ぐな究極の一太刀。' },

  // ---- 敵専用 ----
  { id: 'e_kurayami', name: '闇纏い', type: 'attack', target: 'enemy', element: 'moon', power: 120, mpCost: 0, inheritable: false, desc: '' },
  { id: 'e_hisui', name: '灯吸い', type: 'attack', target: 'enemy', element: 'moon', power: 150, mpCost: 0, inheritable: false, desc: '' },
  { id: 'e_hoshikui', name: '星喰い', type: 'attack', target: 'enemies', element: 'star', power: 110, mpCost: 0, inheritable: false, desc: '' },
  { id: 'e_yamiuta', name: '常夜の子守唄', type: 'debuff', target: 'enemies', power: 30, mpCost: 0, inheritable: false, desc: '' },
]

export function skillById(id: string): Skill {
  const s = SKILLS.find((x) => x.id === id)
  if (!s) throw new Error(`unknown skill: ${id}`)
  return s
}
