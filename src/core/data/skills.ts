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
  { id: 'himamori', name: '灯護り', type: 'buff', buffKind: 'def', target: 'allies', power: 30, mpCost: 8, inheritable: false, desc: '灯の結界で身を包む。防御上昇。' },
  { id: 'kokorooshi', name: '心折りの囁き', type: 'debuff', target: 'enemies', power: 25, mpCost: 7, inheritable: false, desc: '夜の言葉で敵の戦意を挫く。攻撃低下。' },

  // ---- 星神奥義(継承の証) ----
  { id: 'g_tachinui', name: '風織・断ち縫い', type: 'attack', target: 'enemy', element: 'wind', power: 230, mpCost: 14, inheritable: true, desc: '織姫野分の奥義。風の糸で敵を縫い止め断つ。' },
  { id: 'g_fundogeki', name: '大熊憤怒撃', type: 'attack', target: 'enemy', element: 'earth', power: 250, mpCost: 16, inheritable: true, desc: '大熊星辰の奥義。星ごと殴る勢いの剛腕。' },
  { id: 'g_miobiki', name: '千鳥の澪引き', type: 'heal', target: 'allies', power: 140, mpCost: 16, inheritable: true, desc: '澪標千鳥の奥義。癒しの潮が一族を包む。' },
  { id: 'g_ryougen', name: '篝火燎原', type: 'attack', target: 'enemies', element: 'fire', power: 150, mpCost: 15, inheritable: true, desc: '篝火乙女の奥義。恋心と同じで燃え広がる。' },
  { id: 'g_shibariito', name: '千糸絡繰', type: 'debuff', target: 'enemies', power: 40, mpCost: 12, inheritable: true, desc: '宵蜘蛛御前の奥義。見えぬ糸が敵の力を封じる。' },
  { id: 'g_iwakura', name: '磐座の構え', type: 'buff', buffKind: 'def', target: 'allies', power: 45, mpCost: 12, inheritable: true, desc: '石臼翁の奥義。山の如く動かぬ守り。' },
  { id: 'g_tsubame', name: '燕返し', type: 'attack', target: 'enemy', element: 'wind', power: 195, mpCost: 11, inheritable: true, desc: '燕颪の奥義。振り向いた時には終わっている。' },
  { id: 'g_yukiakatsuki', name: '雪暁の経', type: 'attack', target: 'enemies', element: 'water', power: 135, mpCost: 13, inheritable: true, desc: '雪安居の奥義。無音の吹雪が読経とともに降る。' },
  { id: 'g_yakumo', name: '八雲雷舞', type: 'attack', target: 'enemies', element: 'star', power: 150, mpCost: 15, inheritable: true, desc: '鳴神太鼓の奥義。雷鳴の乱れ打ちは祭囃子。' },
  { id: 'g_hiyaku', name: '月裏の秘薬', type: 'heal', target: 'ally', power: 260, mpCost: 13, inheritable: true, desc: '月裏兎の奥義。よく効くがとても苦い。' },
  { id: 'g_kamifubuki', name: '紙吹雪の帳', type: 'debuff', target: 'enemies', power: 35, mpCost: 11, inheritable: true, desc: '紙魚姫の奥義。千の紙片が敵の目を眩ます。' },
  { id: 'g_hokushin', name: '北辰一閃', type: 'attack', target: 'enemy', element: 'star', power: 320, mpCost: 20, inheritable: true, desc: '北辰老の奥義。北極星より真っ直ぐな究極の一太刀。' },

  // ---- 星神奥義(第二陣・13〜24柱) ----
  { id: 'g_minomushi', name: '蓑籠り', type: 'buff', buffKind: 'def', target: 'allies', power: 40, mpCost: 11, inheritable: true, desc: '蓑虫親父の奥義。蓑の中は嵐も届かぬ安全地帯。' },
  { id: 'g_kaiyose', name: '貝寄せの唄', type: 'heal', target: 'allies', power: 95, mpCost: 13, inheritable: true, desc: '貝寄せ乙女の奥義。浜の貝が集まるように、散った気力が戻る。' },
  { id: 'g_kagebousi', name: '影法師写し', type: 'attack', target: 'enemy', element: 'moon', power: 200, mpCost: 12, inheritable: true, desc: '影法師の奥義。敵の影を斬れば本体も斬れている。' },
  { id: 'g_kazaguruma', name: '八ツ羽根回し', type: 'attack', target: 'enemies', element: 'wind', power: 130, mpCost: 13, inheritable: true, desc: '風車翁の奥義。八枚羽根の大風車が敵陣を巻き上げる。' },
  { id: 'g_yuya', name: '湯玉千枚', type: 'attack', target: 'enemies', element: 'water', power: 135, mpCost: 14, inheritable: true, desc: '湯屋女将の奥義。煮えた湯玉の千本散らし。湯加減は地獄。' },
  { id: 'g_suzuriumi', name: '墨海の帳', type: 'debuff', target: 'enemies', power: 38, mpCost: 12, inheritable: true, desc: '硯海姫の奥義。墨の海が敵の目と力を奪う。' },
  { id: 'g_kodama', name: '木霊千唱', type: 'heal', target: 'ally', power: 280, mpCost: 14, inheritable: true, desc: '木霊童子の奥義。千の木霊が快癒の言葉を繰り返す。' },
  { id: 'g_hanabi', name: '大輪牡丹', type: 'attack', target: 'enemies', element: 'fire', power: 155, mpCost: 16, inheritable: true, desc: '花火師寅次の奥義。夜空に咲く大輪は、敵陣の真上で開く。' },
  { id: 'g_shigure', name: '時雨百針', type: 'attack', target: 'enemy', element: 'water', power: 235, mpCost: 14, inheritable: true, desc: '時雨紫の奥義。百粒の時雨が全て針となって一点に降る。' },
  { id: 'g_noroshi', name: '狼煙立て', type: 'buff', target: 'allies', power: 38, mpCost: 12, inheritable: true, desc: '狼煙彦の奥義。天を衝く狼煙が一族の血を沸かせる。攻撃上昇。' },
  { id: 'g_hoshikaji', name: '星鉄鍛ち', type: 'attack', target: 'enemy', element: 'star', power: 260, mpCost: 17, inheritable: true, desc: '星鍛冶翁の奥義。鍛ちたての星鉄は、どんな鎧より硬いものを断つ。' },
  { id: 'g_byakuya', name: '白夜の御来光', type: 'attack', target: 'enemies', element: 'star', power: 145, mpCost: 15, inheritable: true, desc: '白夜巫女の奥義。常夜に一瞬だけ届く、遠い国の朝の光。' },

  // ---- 神授の系統技(GDD_v3 §3) ----
  // 星神120柱時代のインフレ制御: 新規の神は「系統(6)×位階(4)」の共有技を授ける。
  // 固有奥義(g_*)は初期24柱と極ツ星のみ。id: gs_{element}{rank}
  { id: 'gs_fire1', name: '焔手向け', type: 'attack', target: 'enemy', element: 'fire', power: 165, mpCost: 10, inheritable: true, desc: '下つ星の火が刃に宿る。小さくとも、確かに熱い。' },
  { id: 'gs_fire2', name: '焔巡り', type: 'attack', target: 'enemies', element: 'fire', power: 120, mpCost: 13, inheritable: true, desc: '中つ星の火が敵陣を巡り焼く。' },
  { id: 'gs_fire3', name: '緋天灼き', type: 'attack', target: 'enemy', element: 'fire', power: 250, mpCost: 16, inheritable: true, desc: '上つ星の火。夜空の一角が緋に染まる。' },
  { id: 'gs_fire4', name: '焔々大祭', type: 'attack', target: 'enemies', element: 'fire', power: 165, mpCost: 20, inheritable: true, desc: '極ツ星の火。常夜に一夜だけの火祭が顕現する。' },
  { id: 'gs_water1', name: '清め潮', type: 'heal', target: 'ally', power: 170, mpCost: 8, inheritable: true, desc: '下つ星の潮が傷を洗い清める。' },
  { id: 'gs_water2', name: '潮巡り', type: 'heal', target: 'allies', power: 100, mpCost: 14, inheritable: true, desc: '中つ星の潮が隊全体を巡り癒す。' },
  { id: 'gs_water3', name: '大潮の癒し', type: 'heal', target: 'ally', power: 260, mpCost: 14, inheritable: true, desc: '上つ星の大潮。満ちれば大抵の傷は引いていく。' },
  { id: 'gs_water4', name: '海淵の慈雨', type: 'heal', target: 'allies', power: 150, mpCost: 22, inheritable: true, desc: '極ツ星の慈雨。海の底の静けさが隊を包み直す。' },
  { id: 'gs_wind1', name: '風手向け', type: 'attack', target: 'enemy', element: 'wind', power: 160, mpCost: 8, inheritable: true, desc: '下つ星の風が刃を押す。速い。' },
  { id: 'gs_wind2', name: '颪の帳', type: 'debuff', target: 'enemies', power: 30, mpCost: 11, inheritable: true, desc: '中つ星の颪が敵の足並みを乱す。攻撃低下。' },
  { id: 'gs_wind3', name: '八風巡り', type: 'attack', target: 'enemies', element: 'wind', power: 135, mpCost: 15, inheritable: true, desc: '上つ星の八方の風が敵陣を薙ぐ。' },
  { id: 'gs_wind4', name: '天翔る野分', type: 'attack', target: 'enemy', element: 'wind', power: 290, mpCost: 19, inheritable: true, desc: '極ツ星の野分。天を翔けて一点に落ちる。' },
  { id: 'gs_earth1', name: '土手向け', type: 'buff', buffKind: 'def', target: 'allies', power: 32, mpCost: 9, inheritable: true, desc: '下つ星の土気が足元を固める。防御上昇。' },
  { id: 'gs_earth2', name: '地金打ち', type: 'attack', target: 'enemy', element: 'earth', power: 205, mpCost: 13, inheritable: true, desc: '中つ星の重み。地金ごと打ち据える。' },
  { id: 'gs_earth3', name: '磐根の帳', type: 'buff', buffKind: 'def', target: 'allies', power: 48, mpCost: 15, inheritable: true, desc: '上つ星の磐根が隊を囲う。大防御。' },
  { id: 'gs_earth4', name: '国土鳴動', type: 'attack', target: 'enemy', element: 'earth', power: 280, mpCost: 20, inheritable: true, desc: '極ツ星の一撃。国土が鳴動し、山がひとつ低くなる。' },
  { id: 'gs_moon1', name: '月翳し', type: 'debuff', target: 'enemies', power: 28, mpCost: 8, inheritable: true, desc: '下つ星の月影が敵の目を翳らせる。攻撃低下。' },
  { id: 'gs_moon2', name: '月光穿ち', type: 'attack', target: 'enemy', element: 'moon', power: 195, mpCost: 12, inheritable: true, desc: '中つ星の月光が針となって穿つ。' },
  { id: 'gs_moon3', name: '朧の大帳', type: 'debuff', target: 'enemies', power: 45, mpCost: 15, inheritable: true, desc: '上つ星の朧が敵陣を包む。大幅な攻撃低下。' },
  { id: 'gs_moon4', name: '月蝕の顎', type: 'attack', target: 'enemies', element: 'moon', power: 155, mpCost: 20, inheritable: true, desc: '極ツ星の蝕。月を齧る顎が敵陣ごと噛む。' },
  { id: 'gs_star1', name: '星手向け', type: 'attack', target: 'enemy', element: 'star', power: 170, mpCost: 10, inheritable: true, desc: '下つ星の光でも、闇を裂くには足りる。' },
  { id: 'gs_star2', name: '星振りの勧め', type: 'buff', target: 'allies', power: 34, mpCost: 11, inheritable: true, desc: '中つ星の瞬きが隊の血を沸かす。攻撃上昇。' },
  { id: 'gs_star3', name: '天球断ち', type: 'attack', target: 'enemy', element: 'star', power: 255, mpCost: 16, inheritable: true, desc: '上つ星の一閃が天球の弧をなぞって落ちる。' },
  { id: 'gs_star4', name: '星海のうねり', type: 'attack', target: 'enemies', element: 'star', power: 160, mpCost: 21, inheritable: true, desc: '極ツ星の海。星々のうねりが敵陣を呑む。' },

  // ---- 敵専用 ----
  { id: 'e_kurayami', name: '闇纏い', type: 'attack', target: 'enemy', element: 'moon', power: 120, mpCost: 0, inheritable: false, desc: '' },
  { id: 'e_hisui', name: '灯吸い', type: 'attack', target: 'enemy', element: 'moon', power: 150, mpCost: 0, inheritable: false, desc: '' },
  { id: 'e_hoshikui', name: '星喰い', type: 'attack', target: 'enemies', element: 'star', power: 110, mpCost: 0, inheritable: false, desc: '' },
  { id: 'e_yamiuta', name: '常夜の子守唄', type: 'debuff', target: 'enemies', power: 30, mpCost: 0, inheritable: false, desc: '' },
]

import { allTozaSkills } from './toza'
import { allJobSkills } from './jobs'

let ALL_SKILLS: Skill[] | null = null

export function skillById(id: string): Skill {
  if (!ALL_SKILLS) ALL_SKILLS = [...SKILLS, ...allTozaSkills(), ...allJobSkills()]
  const s = ALL_SKILLS.find((x) => x.id === id)
  if (!s) throw new Error(`unknown skill: ${id}`)
  return s
}
