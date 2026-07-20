import type { Element, Skill, Stats, Tomoshigata } from '../types'
import { ELEMENT_LABELS } from '../types'

// ============================================================
// 灯座(とうざ)システム — 本作独自の職業
// 灯型(育て・成人の儀で授ける)× 星脈(血・星神の親から遺伝)= 24灯座
// 俺屍の武器固定職とは異なり、交神の選択と育成の意志が職業を生む
// ============================================================

export type { Tomoshigata }

export interface TomoshigataDef {
  id: Tomoshigata
  label: string
  kana: string
  desc: string
  ritual: string // 成人の儀での口上
  statBias: Partial<Stats>
}

export const TOMOSHIGATA: TomoshigataDef[] = [
  {
    id: 'homura', label: '焔', kana: 'ほむら',
    desc: '灯を刃に焚べる者。攻めの型。夜藪の魔性を最も多く葬るのはいつも焔の灯し手だ。',
    ritual: '「其の灯、猛く焚べよ。振るう刃の先まで燃やせ」',
    statBias: { str: 12, dex: 6 },
  },
  {
    id: 'iwao', label: '巌', kana: 'いわお',
    desc: '灯を鎧に焚べる者。守りの型。巌の灯し手が立つ限り、後ろの家族は倒れない。',
    ritual: '「其の灯、深く埋けよ。巌の如く、家族の前に在れ」',
    statBias: { vit: 14, mnd: 4 },
  },
  {
    id: 'nagi', label: '凪', kana: 'なぎ',
    desc: '灯を足先に焚べる者。疾さと搦手の型。風が凪いだ一瞬こそ、凪の灯し手の間合い。',
    ritual: '「其の灯、細く長く。夜のどの風よりも疾く在れ」',
    statBias: { agi: 12, luk: 6 },
  },
  {
    id: 'sumi', label: '澄', kana: 'すみ',
    desc: '灯を掌に焚べる者。癒しと支えの型。澄んだ灯は傷を照らし、心の闇を祓う。',
    ritual: '「其の灯、澄みて静かに。家族の傷を照らす灯たれ」',
    statBias: { mnd: 12, vit: 6 },
  },
]

export function tomoshigataById(id: Tomoshigata): TomoshigataDef {
  return TOMOSHIGATA.find((t) => t.id === id)!
}

// ---- 灯座(灯型×星脈)の名鑑 ----
export interface TozaDef {
  gata: Tomoshigata
  vein: Element // 星脈
  name: string // 灯座の名
  title: string // 二つ名
  skills: Skill[] // 固有技(習得順)
  ougi: Skill // 灯座奥義(生後18月で開眼)
}

// 技ビルダー(定義の重複を減らす)
function mk(
  id: string, name: string, type: Skill['type'], target: Skill['target'],
  power: number, mpCost: number, desc: string, element?: Element,
): Skill {
  // M29修正: 灯座バフの効果種別を説明文から導く。灯座「巌(いわお=守)」は全て防御、「澄」は混在するが
  // 攻撃バフは必ず「攻撃(上昇)」を明記し、防御バフは「防御/守/護」を含むか攻撃語を含まない。
  const buffKind: Skill['buffKind'] =
    type !== 'buff' ? undefined
      : /攻撃/.test(desc) && !/防御|守|護/.test(desc) ? 'atk'
      : 'def'
  return { id, name, type, target, element, power, mpCost, inheritable: false, desc, buffKind }
}

// 各灯座: 固有技3(6月・生後10月・14月で習得)+奥義1(18月)
// 名付けの流儀: 焔=武、巌=守、凪=風雅、澄=祈り。星脈の語彙を織り込む
const T: TozaDef[] = [
  // ============ 焔(攻) ============
  {
    gata: 'homura', vein: 'fire', name: '爆ぜ灯', title: '火中の火',
    skills: [
      mk('tz_hf1', '火花散らし', 'attack', 'enemy', 150, 6, '刃先の灯を爆ぜさせる初伝。', 'fire'),
      mk('tz_hf2', '緋の薙ぎ', 'attack', 'enemies', 115, 12, '横一文字に緋の帯が走る。', 'fire'),
      mk('tz_hf3', '重ね火', 'attack', 'enemy', 205, 14, '斬撃に遅れて二度目の火が爆ぜる。', 'fire'),
    ],
    ougi: mk('tz_hfo', '奥義・不知火崩し', 'attack', 'enemy', 300, 22, '家祖が封じた業火の型。一振りで夜が明るむ。', 'fire'),
  },
  {
    gata: 'homura', vein: 'water', name: '沸き灯', title: '滾る潮',
    skills: [
      mk('tz_hw1', '湯玉突き', 'attack', 'enemy', 150, 6, '沸き立つ水泡を纏う突き。', 'water'),
      mk('tz_hw2', '荒潮', 'attack', 'enemies', 115, 12, '滾る潮が敵陣を洗う。', 'water'),
      mk('tz_hw3', '渦刃', 'attack', 'enemy', 205, 14, '渦を巻く斬撃が防具ごと呑む。', 'water'),
    ],
    ougi: mk('tz_hwo', '奥義・千潮鳴り', 'attack', 'enemy', 300, 22, '千の波が一点に集う。轟きは遠雷の如し。', 'water'),
  },
  {
    gata: 'homura', vein: 'wind', name: '走り灯', title: '追い風の刃',
    skills: [
      mk('tz_hd1', '風乗り斬り', 'attack', 'enemy', 150, 6, '追い風に乗せた初太刀。', 'wind'),
      mk('tz_hd2', '鎌鼬', 'attack', 'enemies', 115, 12, '見えぬ刃が敵陣を駆ける。', 'wind'),
      mk('tz_hd3', '燕落とし', 'attack', 'enemy', 205, 14, '宙の燕さえ落とす神速の一刀。', 'wind'),
    ],
    ougi: mk('tz_hdo', '奥義・野分一文字', 'attack', 'enemy', 300, 22, '野分の只中でも直進する究極の一文字。', 'wind'),
  },
  {
    gata: 'homura', vein: 'earth', name: '熾火灯', title: '山割りの腕',
    skills: [
      mk('tz_he1', '地割り打ち', 'attack', 'enemy', 150, 6, '大地ごと敵を打つ剛撃。', 'earth'),
      mk('tz_he2', '岩雪崩', 'attack', 'enemies', 115, 12, '土砂の勢いで敵陣を押し潰す。', 'earth'),
      mk('tz_he3', '断層斬り', 'attack', 'enemy', 205, 14, '大地の裂け目ごと敵を断つ。', 'earth'),
    ],
    ougi: mk('tz_heo', '奥義・国砕き', 'attack', 'enemy', 300, 22, '一撃が山の形を変えたと家譜に残る。', 'earth'),
  },
  {
    gata: 'homura', vein: 'moon', name: '影灯', title: '月裏の太刀',
    skills: [
      mk('tz_hm1', '影渡り斬り', 'attack', 'enemy', 150, 6, '影から影へ渡って斬る。', 'moon'),
      mk('tz_hm2', '月暈払い', 'attack', 'enemies', 115, 12, '月暈の輪が刃となって広がる。', 'moon'),
      mk('tz_hm3', '無音抜刀', 'attack', 'enemy', 205, 14, '音より先に傷が開く。', 'moon'),
    ],
    ougi: mk('tz_hmo', '奥義・朔夜断ち', 'attack', 'enemy', 300, 22, '月のない夜だけ振るえる、闇ごと断つ太刀。', 'moon'),
  },
  {
    gata: 'homura', vein: 'star', name: '流れ灯', title: '墜星の切っ先',
    skills: [
      mk('tz_hs1', '星火穿ち', 'attack', 'enemy', 150, 6, '切っ先に星火を宿す。', 'star'),
      mk('tz_hs2', '星屑時雨', 'attack', 'enemies', 115, 12, '斬撃の後に星屑が降る。', 'star'),
      mk('tz_hs3', '彗星突き', 'attack', 'enemy', 205, 14, '尾を引く突きは避けられぬ。', 'star'),
    ],
    ougi: mk('tz_hso', '奥義・天の川渡り', 'attack', 'enemy', 300, 22, '天の川を一息に渡る神速。斬られた者は星を見る。', 'star'),
  },

  // ============ 巌(守) ============
  {
    gata: 'iwao', vein: 'fire', name: '篝巌', title: '燃える城壁',
    skills: [
      mk('tz_if1', '火壁の構え', 'buff', 'allies', 35, 10, '灯の壁が家族を包む。防御上昇。', 'fire'),
      mk('tz_if2', '熱返し', 'attack', 'enemy', 140, 10, '受けた熱を練り込んで返す。', 'fire'),
      mk('tz_if3', '篝火城', 'buff', 'allies', 45, 14, '燃える城壁の如き大防御。', 'fire'),
    ],
    ougi: mk('tz_ifo', '奥義・不落の篝', 'buff', 'allies', 60, 20, '千年落ちなかった篝の護り。', 'fire'),
  },
  {
    gata: 'iwao', vein: 'water', name: '深潭巌', title: '静かな深み',
    skills: [
      mk('tz_iw1', '水鏡の構え', 'buff', 'allies', 35, 10, '水鏡が刃を滑らせる。防御上昇。', 'water'),
      mk('tz_iw2', '受け流し', 'attack', 'enemy', 140, 10, '敵の勢いを受け流し、そのまま返す。', 'water'),
      mk('tz_iw3', '深潭の帳', 'buff', 'allies', 45, 14, '深い水底の静けさで包む。', 'water'),
    ],
    ougi: mk('tz_iwo', '奥義・海淵の座', 'buff', 'allies', 60, 20, '海の底より深い不動の護り。', 'water'),
  },
  {
    gata: 'iwao', vein: 'wind', name: '風濤巌', title: '嵐を宿す盾',
    skills: [
      mk('tz_id1', '風柵', 'buff', 'allies', 35, 10, '風の柵が矢弾を逸らす。防御上昇。', 'wind'),
      mk('tz_id2', '颪返し', 'attack', 'enemy', 140, 10, '山颪の勢いで打ち返す。', 'wind'),
      mk('tz_id3', '嵐の胸壁', 'buff', 'allies', 45, 14, '嵐そのものを胸壁とする。', 'wind'),
    ],
    ougi: mk('tz_ido', '奥義・八方風牢', 'buff', 'allies', 60, 20, '八方の風を牢と成し、敵意を閉め出す。', 'wind'),
  },
  {
    gata: 'iwao', vein: 'earth', name: '磐座巌', title: '動かぬもの',
    skills: [
      mk('tz_ie1', '磐の構え', 'buff', 'allies', 35, 10, '磐座の如く根を張る。防御上昇。', 'earth'),
      mk('tz_ie2', '大地砕き', 'attack', 'enemy', 140, 10, '守りから転じる一撃は山の重さ。', 'earth'),
      mk('tz_ie3', '御神体の帳', 'buff', 'allies', 45, 14, '磐座の神気が家族を包む。', 'earth'),
    ],
    ougi: mk('tz_ieo', '奥義・千年不動', 'buff', 'allies', 60, 20, '千年動かぬ巌の座。玄冬の爪も通らぬ。', 'earth'),
  },
  {
    gata: 'iwao', vein: 'moon', name: '朧巌', title: '月光の盾',
    skills: [
      mk('tz_im1', '朧の帳', 'buff', 'allies', 35, 10, '朧月夜の帳が姿を霞ませる。防御上昇。', 'moon'),
      mk('tz_im2', '月光返し', 'attack', 'enemy', 140, 10, '月光を束ねて打ち返す。', 'moon'),
      mk('tz_im3', '無明の壁', 'buff', 'allies', 45, 14, '闇そのものを壁とする。', 'moon'),
    ],
    ougi: mk('tz_imo', '奥義・月天の御盾', 'buff', 'allies', 60, 20, '月を背負う大盾。夜の全てを受け止める。', 'moon'),
  },
  {
    gata: 'iwao', vein: 'star', name: '北辰巌', title: '空の軸',
    skills: [
      mk('tz_is1', '星の錨', 'buff', 'allies', 35, 10, '星に錨を降ろし、陣が揺らがぬ。防御上昇。', 'star'),
      mk('tz_is2', '星鉄打ち', 'attack', 'enemy', 140, 10, '墜星の鉄を思わせる重い一打。', 'star'),
      mk('tz_is3', '星辰結界', 'buff', 'allies', 45, 14, '星々を結んだ結界が広がる。', 'star'),
    ],
    ougi: mk('tz_iso', '奥義・北辰不動陣', 'buff', 'allies', 60, 20, '北極星の如く、陣の軸として不動を成す。', 'star'),
  },

  // ============ 凪(速・搦手) ============
  {
    gata: 'nagi', vein: 'fire', name: '陽炎凪', title: '揺らめく間合い',
    skills: [
      mk('tz_nf1', '陽炎足', 'attack', 'enemy', 135, 5, '陽炎の如く揺れて間合いを盗む。', 'fire'),
      mk('tz_nf2', '目眩まし火', 'debuff', 'enemies', 30, 10, '火の粉で敵の目を灼く。攻撃低下。', 'fire'),
      mk('tz_nf3', '火走り', 'attack', 'enemy', 185, 12, '火の線が走った後に傷が開く。', 'fire'),
    ],
    ougi: mk('tz_nfo', '奥義・逃げ水斬り', 'attack', 'enemy', 280, 20, '追えば遠ざかる逃げ水の太刀。触れた時には終わっている。', 'fire'),
  },
  {
    gata: 'nagi', vein: 'water', name: '小波凪', title: '音のない足',
    skills: [
      mk('tz_nw1', '小波打ち', 'attack', 'enemy', 135, 5, '小波の静けさで踏み込む。', 'water'),
      mk('tz_nw2', '霧笛', 'debuff', 'enemies', 30, 10, '霧が敵の連携を断つ。攻撃低下。', 'water'),
      mk('tz_nw3', '水面走り', 'attack', 'enemy', 185, 12, '水面を蹴る二段の踏み込み。', 'water'),
    ],
    ougi: mk('tz_nwo', '奥義・凪の一瞬', 'attack', 'enemy', 280, 20, '波も風も止む一瞬にだけ抜ける太刀。', 'water'),
  },
  {
    gata: 'nagi', vein: 'wind', name: '疾風凪', title: '風より先に',
    skills: [
      mk('tz_nd1', '先の先', 'attack', 'enemy', 135, 5, '敵の起こりより早く打つ。', 'wind'),
      mk('tz_nd2', '巻き藁風', 'debuff', 'enemies', 30, 10, '足元の風が敵の踏ん張りを奪う。攻撃低下。', 'wind'),
      mk('tz_nd3', '二段風', 'attack', 'enemy', 185, 12, '一の太刀の風圧が二の太刀になる。', 'wind'),
    ],
    ougi: mk('tz_ndo', '奥義・風の通り道', 'attack', 'enemy', 280, 20, '風の通り道が見える者だけの、遮れぬ一撃。', 'wind'),
  },
  {
    gata: 'nagi', vein: 'earth', name: '砂紋凪', title: '足跡を残さぬ者',
    skills: [
      mk('tz_ne1', '砂隠れ打ち', 'attack', 'enemy', 135, 5, '砂塵に紛れて急所を打つ。', 'earth'),
      mk('tz_ne2', '蟻地獄', 'debuff', 'enemies', 30, 10, '足場が崩れ敵の力が逃げる。攻撃低下。', 'earth'),
      mk('tz_ne3', '地擦り斬り', 'attack', 'enemy', 185, 12, '地を這う低い斬撃は目で追えぬ。', 'earth'),
    ],
    ougi: mk('tz_neo', '奥義・無足の法', 'attack', 'enemy', 280, 20, '足跡ひとつ残さず背後を取る古流の極み。', 'earth'),
  },
  {
    gata: 'nagi', vein: 'moon', name: '朧凪', title: '月影の刺客',
    skills: [
      mk('tz_nm1', '影縫い', 'attack', 'enemy', 135, 5, '影を縫って動きを奪いつつ打つ。', 'moon'),
      mk('tz_nm2', '眠り月', 'debuff', 'enemies', 30, 10, '月光が敵のまぶたに重く降りる。攻撃低下。', 'moon'),
      mk('tz_nm3', '月影渡り', 'attack', 'enemy', 185, 12, '月影だけを踏んで間合いを消す。', 'moon'),
    ],
    ougi: mk('tz_nmo', '奥義・胡蝶の夢', 'attack', 'enemy', 280, 20, '敵は夢の中で斬られたことにも気づかない。', 'moon'),
  },
  {
    gata: 'nagi', vein: 'star', name: '流星凪', title: '瞬きの間',
    skills: [
      mk('tz_ns1', '瞬き打ち', 'attack', 'enemy', 135, 5, '星の瞬きの間に三歩詰める。', 'star'),
      mk('tz_ns2', '星霞', 'debuff', 'enemies', 30, 10, '星霞が敵の狙いを狂わせる。攻撃低下。', 'star'),
      mk('tz_ns3', '流星脚', 'attack', 'enemy', 185, 12, '流星の軌道で敵陣を割る。', 'star'),
    ],
    ougi: mk('tz_nso', '奥義・光年跳び', 'attack', 'enemy', 280, 20, '一歩が光年。誰もその間合いを測れない。', 'star'),
  },

  // ============ 澄(癒・支援) ============
  {
    gata: 'sumi', vein: 'fire', name: '温火澄', title: '囲炉裏の心',
    skills: [
      mk('tz_sf1', '温めの灯', 'heal', 'ally', 160, 7, '囲炉裏の温もりで傷を癒す。', 'fire'),
      mk('tz_sf2', '活を入れる火', 'buff', 'allies', 30, 10, '心の火を焚きつける。攻撃上昇。', 'fire'),
      mk('tz_sf3', '篝の宴', 'heal', 'allies', 100, 15, '篝火を囲む団欒が家族を癒す。', 'fire'),
    ],
    ougi: mk('tz_sfo', '奥義・竈の神楽', 'heal', 'allies', 150, 22, '竈の神々が舞い降り、大いなる癒しを賜う。', 'fire'),
  },
  {
    gata: 'sumi', vein: 'water', name: '清水澄', title: '湧き水の手',
    skills: [
      mk('tz_sw1', '清めの水', 'heal', 'ally', 160, 7, '湧き水が傷口を洗い清める。', 'water'),
      mk('tz_sw2', '禊の帳', 'buff', 'allies', 30, 10, '禊の水が守りを固める。防御上昇。', 'water'),
      mk('tz_sw3', '慈雨', 'heal', 'allies', 100, 15, '恵みの雨が隊全体に降り注ぐ。', 'water'),
    ],
    ougi: mk('tz_swo', '奥義・産湯の記憶', 'heal', 'allies', 150, 22, '生まれた日の産湯の温もりを呼び覚ます、命の癒し。', 'water'),
  },
  {
    gata: 'sumi', vein: 'wind', name: '薫風澄', title: '風の便り',
    skills: [
      mk('tz_sd1', '風の手当て', 'heal', 'ally', 160, 7, '薫風が痛みを攫っていく。', 'wind'),
      mk('tz_sd2', '追い風の歌', 'buff', 'allies', 30, 10, '背を押す歌声。攻撃上昇。', 'wind'),
      mk('tz_sd3', '青嵐の息吹', 'heal', 'allies', 100, 15, '若葉の香る風が隊を包む。', 'wind'),
    ],
    ougi: mk('tz_sdo', '奥義・千里の風便り', 'heal', 'allies', 150, 22, '千里先の郷の風が、家族の声を運んでくる。', 'wind'),
  },
  {
    gata: 'sumi', vein: 'earth', name: '薬草澄', title: '土の恵み',
    skills: [
      mk('tz_se1', '薬草当て', 'heal', 'ally', 160, 7, '夜藪の薬草を見分ける目を持つ。', 'earth'),
      mk('tz_se2', '土竜の守り', 'buff', 'allies', 30, 10, '大地の霊が足元を固める。防御上昇。', 'earth'),
      mk('tz_se3', '百草湯', 'heal', 'allies', 100, 15, '百の薬草を煎じた湯気が隊を癒す。', 'earth'),
    ],
    ougi: mk('tz_seo', '奥義・大地の臍', 'heal', 'allies', 150, 22, '大地の臍から湧く生命の泉。枯れた灯も再び揺れる。', 'earth'),
  },
  {
    gata: 'sumi', vein: 'moon', name: '月渡澄', title: '月の薬師',
    skills: [
      mk('tz_sm1', '月光の雫', 'heal', 'ally', 160, 7, '月光を集めた雫は苦くない。', 'moon'),
      mk('tz_sm2', '子守唄', 'debuff', 'enemies', 30, 10, '家祖の子守唄の一節。敵の戦意が緩む。', 'moon'),
      mk('tz_sm3', '月の沙汰', 'heal', 'allies', 100, 15, '月が満ちる力を隊に分け与える。', 'moon'),
    ],
    ougi: mk('tz_smo', '奥義・望月の癒し', 'heal', 'allies', 150, 22, '満月の夜の力を全て注ぐ。月裏兎も一目置く秘術。', 'moon'),
  },
  {
    gata: 'sumi', vein: 'star', name: '星詠澄', title: '星図を読む者',
    skills: [
      mk('tz_ss1', '星の癒し', 'heal', 'ally', 160, 7, '星の巡りを読み、最も良い時に手当てる。', 'star'),
      mk('tz_ss2', '吉兆の詠み', 'buff', 'allies', 30, 10, '今宵の星は良い。攻撃上昇。', 'star'),
      mk('tz_ss3', '星降りの祈り', 'heal', 'allies', 100, 15, '流星に祈りを乗せ、隊全体を照らす。', 'star'),
    ],
    ougi: mk('tz_sso', '奥義・星巡りの理', 'heal', 'allies', 150, 22, '星の理そのものに触れ、運命を少しだけ書き換える。', 'star'),
  },
]

export const TOZA: TozaDef[] = T

export function tozaOf(gata: Tomoshigata, vein: Element): TozaDef {
  return TOZA.find((t) => t.gata === gata && t.vein === vein)!
}

export function tozaLabel(gata: Tomoshigata, vein: Element): string {
  const t = tozaOf(gata, vein)
  return `${t.name}(${tomoshigataById(gata).label}ノ${ELEMENT_LABELS[vein]})`
}

// 全灯座技(skillByIdへの統合用)
export function allTozaSkills(): Skill[] {
  return TOZA.flatMap((t) => [...t.skills, t.ougi])
}
