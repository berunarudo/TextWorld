
const SAVE_STORAGE_KEY = "text-world-rpg-save";
const MAX_LOG_ENTRIES = 80;
const SAVED_LOG_ENTRIES = 40;
const AUTOSAVE_DELAY_MS = 800;

let autosaveTimer = null;
let logEntryCounter = 0;
let textEffectTimer = null;

const mojiruLabelMap = {
  attack: "記述",
  skill: "改変",
  item: "データ"
};

const defaultLabelMap = {
  attack: "攻撃",
  skill: "スキル",
  item: "アイテム"
};

const areaTermOverwriteMap = {
  forest: { from: "森", to: "文字列の森" },
  cave: { from: "洞窟", to: "未読行の洞窟" },
  desert: { from: "砂漠", to: "削れた文章砂漠" },
  sea: { from: "海", to: "波打つ記述海" },
  volcano: { from: "火山", to: "燃える文字列火山" },
  snow: { from: "雪", to: "凍る文章雪原" },
  fairy: { from: "妖精", to: "装飾語の妖精庭園" },
  sky: { from: "天空", to: "空白行の上空" },
  divine: { from: "神域", to: "過剰整文の神域" },
  apocalypse: { from: "終末", to: "欠損構文の終末域" },
  creator: { from: "創造", to: "上書き原文" }
};

const recommendedBossLevelByFloor = {
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  60: 60,
  70: 70,
  80: 80,
  90: 90,
  99: 100,
  100: 110
};

const difficultyConfig = {
  normal: {
    id: "normal",
    label: "Normal",
    enemyHpMultiplier: 1,
    enemyAtkMultiplier: 1,
    enemyXpMultiplier: 1,
    bossMultiplier: 1,
    ailmentChanceMultiplier: 1,
    endlessEnabled: false
  },
  hard: {
    id: "hard",
    label: "Hard",
    enemyHpMultiplier: 1.24,
    enemyAtkMultiplier: 1.18,
    enemyXpMultiplier: 1.14,
    bossMultiplier: 1.18,
    ailmentChanceMultiplier: 1.12,
    endlessEnabled: false
  },
  endless: {
    id: "endless",
    label: "Endless",
    enemyHpMultiplier: 1.08,
    enemyAtkMultiplier: 1.08,
    enemyXpMultiplier: 1.2,
    bossMultiplier: 1.14,
    ailmentChanceMultiplier: 1.08,
    endlessEnabled: true
  }
};

const endlessBossRotation = ["dominion", "nemesis", "griffon", "fairyQueen", "iceDragon", "ifrit", "sandWorm"];

const endlessAreaData = {
  id: "endless",
  name: "エンドレス領域",
  floors: { start: 101, end: 9999 },
  enemies: ["seraphimGuard", "holyBeast", "judgementEye", "voidKnight", "collapseBeast", "abyssWorm", "thunderBird", "airElement"],
  bossId: null,
  ambientLogs: [
    "文脈が循環し、同じはずの階層が別の意味で再構築される。",
    "改行の向こうに終わりはない。塔は無限注釈へ伸びていく。",
    "崩れた構文と整いすぎた文法が混在する異常領域だ。"
  ],
  explorationTexts: {
    quiet: [
      "無限の余白が波打ち、何も起こらないまま次の行へ流れた。",
      "未定義の語句が現れては消え、領域は静寂を保っている。"
    ],
    hpRecovery: [
      "自己修復の追記が走り、HPが {amount} 回復した。"
    ],
    mpRecovery: [
      "断片化した魔力注釈を統合し、MPが {amount} 回復した。"
    ],
    hpRecoveryNoEffect: "修復コードは実行されたが、HPはすでに満ちていた。",
    mpRecoveryNoEffect: "魔力統合は完了したが、MPはすでに満ちていた。",
    itemFind: {
      potion: "異常領域の隙間からポーションの原型データを回収した。",
      manaPotion: "循環層の裂け目でマナポーションの記述を拾った。"
    },
    advance: "終わりのない文脈をたどり、ハルトは {floor}階 へ進んだ。"
  },
  completionMessage: ""
};

const trueEndRequiredFlags = [
  "readForbiddenText",
  "touchedUnknownSymbol",
  "foundBrokenPage",
  "sawRewriteEvent",
  "heardHiddenVoice"
];

const hiddenStoryFlagSet = new Set([
  ...trueEndRequiredFlags,
  "refusedFalseChoice",
  "metUnknownEntity",
  "rememberedOriginalWorld",
  "clearedWithoutUsingItem",
  "defeatedBossUnderCondition",
  "sawMissingPage",
  "sawNarratorInterference"
]);

const achievementData = [
  { id: "progress_first_step", name: "初めての一歩", description: "1階に到達", category: "進行", isHidden: false, conditionType: "floor_reached", conditionValue: 1 },
  { id: "progress_forest", name: "森の突破者", description: "10階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 10 },
  { id: "progress_cave", name: "洞窟制覇", description: "20階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 20 },
  { id: "progress_desert", name: "砂漠制覇", description: "30階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 30 },
  { id: "progress_sea", name: "海域制覇", description: "40階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 40 },
  { id: "progress_volcano", name: "火山制覇", description: "50階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 50 },
  { id: "progress_snow", name: "雪原制覇", description: "60階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 60 },
  { id: "progress_fairy", name: "妖精郷制覇", description: "70階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 70 },
  { id: "progress_sky", name: "天空突破", description: "80階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 80 },
  { id: "progress_divine", name: "神域到達", description: "90階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 90 },
  { id: "progress_apocalypse", name: "終末越え", description: "99階ボスを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 99 },
  { id: "progress_escape", name: "脱出成功", description: "創造神モジールを撃破", category: "進行", isHidden: false, conditionType: "boss_floor_defeated", conditionValue: 100 },
  { id: "battle_first_win", name: "初勝利", description: "初めて敵を倒す", category: "戦闘", isHidden: false, conditionType: "total_kills_at_least", conditionValue: 1 },
  { id: "battle_100", name: "百戦錬磨", description: "累計100体撃破", category: "戦闘", isHidden: false, conditionType: "total_kills_at_least", conditionValue: 100 },
  { id: "battle_500", name: "千文字斬り", description: "累計500体撃破", category: "戦闘", isHidden: false, conditionType: "total_kills_at_least", conditionValue: 500 },
  { id: "battle_hp1", name: "不屈", description: "HP1で勝利", category: "戦闘", isHidden: false, conditionType: "hp1_victory_count_at_least", conditionValue: 1 },
  { id: "battle_boss_nodmg", name: "無傷の勝利", description: "被ダメージ0でボス撃破", category: "戦闘", isHidden: false, conditionType: "boss_no_damage_wins_at_least", conditionValue: 1 },
  { id: "battle_low_level_boss", name: "巨人殺し", description: "推奨レベル未満でボス撃破", category: "戦闘", isHidden: false, conditionType: "under_level_boss_wins_at_least", conditionValue: 1 },
  { id: "growth_first_levelup", name: "初レベルアップ", description: "初めてレベルアップ", category: "成長", isHidden: false, conditionType: "player_level_at_least", conditionValue: 2 },
  { id: "growth_level_10", name: "二桁到達", description: "レベル10到達", category: "成長", isHidden: false, conditionType: "player_level_at_least", conditionValue: 10 },
  { id: "growth_level_30", name: "熟練者", description: "レベル30到達", category: "成長", isHidden: false, conditionType: "player_level_at_least", conditionValue: 30 },
  { id: "growth_level_50", name: "極めし者", description: "レベル50到達", category: "成長", isHidden: false, conditionType: "player_level_at_least", conditionValue: 50 },
  { id: "growth_level_100", name: "超越者", description: "レベル100到達", category: "成長", isHidden: false, conditionType: "player_level_at_least", conditionValue: 100 },
  { id: "growth_first_skill", name: "初スキル習得", description: "初めてスキル取得", category: "成長", isHidden: false, conditionType: "learned_skills_at_least", conditionValue: 1 },
  { id: "growth_10_skills", name: "蒐集者", description: "スキルを10個習得", category: "成長", isHidden: false, conditionType: "learned_skills_at_least", conditionValue: 10 },
  { id: "growth_30_skills", name: "全能への道", description: "スキルを30個習得", category: "成長", isHidden: false, conditionType: "learned_skills_at_least", conditionValue: 30 },
  { id: "item_first_use", name: "初使用", description: "初めてアイテムを使用", category: "アイテム", isHidden: false, conditionType: "items_used_at_least", conditionValue: 1 },
  { id: "item_use_20", name: "備えあれば憂いなし", description: "アイテムを累計20回使用", category: "アイテム", isHidden: false, conditionType: "items_used_at_least", conditionValue: 20 },
  { id: "item_get_50", name: "収集癖", description: "アイテムを累計50個取得", category: "アイテム", isHidden: false, conditionType: "items_gained_at_least", conditionValue: 50 },
  { id: "loop_2", name: "再挑戦者", description: "2周目に入る", category: "周回", isHidden: false, conditionType: "cycle_count_at_least", conditionValue: 1 },
  { id: "loop_clear_3", name: "物語の読者", description: "3周クリア", category: "周回", isHidden: false, conditionType: "clear_count_at_least", conditionValue: 3 },
  { id: "loop_clear_5", name: "テキストの住人", description: "5周クリア", category: "周回", isHidden: false, conditionType: "clear_count_at_least", conditionValue: 5 },
  { id: "hidden_voice", name: "行間の声", description: "隠された声を聞いた", category: "隠し", isHidden: true, conditionType: "story_flag_true", conditionValue: "heardHiddenVoice" },
  { id: "hidden_pages", name: "欠損ページ蒐集", description: "真実に繋がる断片フラグを5種取得", category: "隠し", isHidden: true, conditionType: "story_flag_count_at_least", conditionValue: 5 },
  { id: "hidden_true_end", name: "世界の裏側", description: "真エンディングへ到達", category: "隠し", isHidden: true, conditionType: "true_end_reached", conditionValue: 1 },
  { id: "difficulty_hard_clear", name: "苛烈なる踏破", description: "Hardで100階を踏破", category: "難易度", isHidden: false, conditionType: "clear_on_difficulty_at_least", conditionValue: "hard:1" },
  { id: "difficulty_endless_150", name: "終わらない行", description: "Endlessで150階到達", category: "難易度", isHidden: false, conditionType: "endless_best_floor_at_least", conditionValue: 150 }
];

const levelBandTargets = [
  { floorStart: 1, floorEnd: 10, expectedLevel: "10前後" },
  { floorStart: 11, floorEnd: 20, expectedLevel: "20-30" },
  { floorStart: 21, floorEnd: 30, expectedLevel: "30-40" },
  { floorStart: 31, floorEnd: 40, expectedLevel: "40-50" },
  { floorStart: 41, floorEnd: 50, expectedLevel: "50-60" },
  { floorStart: 51, floorEnd: 60, expectedLevel: "60-70" },
  { floorStart: 61, floorEnd: 70, expectedLevel: "70-80" },
  { floorStart: 71, floorEnd: 80, expectedLevel: "80-90" },
  { floorStart: 81, floorEnd: 90, expectedLevel: "90-100" },
  { floorStart: 91, floorEnd: 99, expectedLevel: "100以上" },
  { floorStart: 100, floorEnd: 100, expectedLevel: "最終決戦" }
];

const balanceByBand = {
  1: { hpMult: 1.75, atkMult: 1.45, defAdd: 0, xpMult: 2.6, bossHpMult: 2.25, bossAtkMult: 1.85, bossDefAdd: 1, bossXpMult: 4.0 },
  2: { hpMult: 2.05, atkMult: 1.7, defAdd: 1, xpMult: 3.1, bossHpMult: 2.4, bossAtkMult: 2.0, bossDefAdd: 2, bossXpMult: 4.4 },
  3: { hpMult: 2.3, atkMult: 1.95, defAdd: 2, xpMult: 3.6, bossHpMult: 2.55, bossAtkMult: 2.1, bossDefAdd: 3, bossXpMult: 4.8 },
  4: { hpMult: 2.6, atkMult: 2.2, defAdd: 3, xpMult: 4.2, bossHpMult: 2.7, bossAtkMult: 2.25, bossDefAdd: 4, bossXpMult: 5.1 },
  5: { hpMult: 2.95, atkMult: 2.45, defAdd: 4, xpMult: 4.8, bossHpMult: 2.85, bossAtkMult: 2.35, bossDefAdd: 5, bossXpMult: 5.5 },
  6: { hpMult: 3.25, atkMult: 2.7, defAdd: 5, xpMult: 5.5, bossHpMult: 3.0, bossAtkMult: 2.45, bossDefAdd: 6, bossXpMult: 5.9 },
  7: { hpMult: 3.6, atkMult: 2.95, defAdd: 6, xpMult: 6.2, bossHpMult: 3.15, bossAtkMult: 2.6, bossDefAdd: 7, bossXpMult: 6.3 },
  8: { hpMult: 3.95, atkMult: 3.2, defAdd: 7, xpMult: 7.0, bossHpMult: 3.3, bossAtkMult: 2.75, bossDefAdd: 8, bossXpMult: 6.8 },
  9: { hpMult: 4.35, atkMult: 3.45, defAdd: 8, xpMult: 7.8, bossHpMult: 3.5, bossAtkMult: 2.9, bossDefAdd: 10, bossXpMult: 7.2 },
  10: { hpMult: 4.8, atkMult: 3.75, defAdd: 10, xpMult: 8.8, bossHpMult: 3.7, bossAtkMult: 3.05, bossDefAdd: 12, bossXpMult: 7.8 },
  11: { hpMult: 5.3, atkMult: 4.05, defAdd: 12, xpMult: 10.0, bossHpMult: 4.0, bossAtkMult: 3.3, bossDefAdd: 14, bossXpMult: 8.4 }
};

const bossSpRewardByFloor = {
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  60: 60,
  70: 70,
  80: 80,
  90: 90,
  99: 99,
  100: 0
};

const areaOrder = [
  "forest",
  "cave",
  "desert",
  "sea",
  "volcano",
  "snow",
  "fairy",
  "sky",
  "divine",
  "apocalypse",
  "creator"
];

const areaData = {
  forest: {
    id: "forest",
    name: "森エリア",
    floors: { start: 1, end: 10 },
    enemies: ["goblin", "wolf", "slime"],
    bossId: "orc",
    ambientLogs: [
      "森を進んでいる……",
      "文字で描かれた木々が揺れている。",
      "葉のざわめきが、行間のように広がっていく。",
      "足元の地面が文章のように連なっている。",
      "淡い記号の霧が、森の奥から流れてきた。"
    ],
    explorationTexts: {
      quiet: [
        "文字で描かれた風が吹き抜けた。",
        "森の段落が静かにめくれ、何事もなく閉じた。",
        "木々のあいだで読点のような光がまたたいた。"
      ],
      hpRecovery: [
        "文章の隙間から柔らかな文字光が流れ込み、HPが {amount} 回復した。",
        "森の注釈が身体に重なり、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "不安定なコード片を吸収し、MPが {amount} 回復した。",
        "森の余白に漂う記述を取り込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "回復の文章が流れ込んだが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "不安定なコード片はほどけたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "地面に「Potion」と書かれたアイテムデータが落ちていた。",
        manaPotion: "青い記述で封じられたマナポーションのデータ片を拾った。"
      },
      advance: "森の文章を読み進め、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "森エリアクリア。巨大な一文が左右に割れ、次なる領域への道が現れた。"
  },
  cave: {
    id: "cave",
    name: "洞窟エリア",
    floors: { start: 11, end: 20 },
    enemies: ["skeleton", "zombie", "darkBat"],
    bossId: "golem",
    ambientLogs: [
      "岩肌に刻まれた文字列が、暗い洞窟で微かに光っている。",
      "洞窟の壁面に、誰かが削ったようなルーンの文章が続いている。",
      "足音が反響し、遅れて別の行から返事が返ってきた。",
      "闇の奥で、欠けた単語の結晶が鈍くまたたいた。",
      "湿った空気に混じって、古い記述の匂いが漂う。"
    ],
    explorationTexts: {
      quiet: [
        "滴る雫が記号のように落ち、洞窟は再び静寂へ戻った。",
        "壁の隙間で淡い文字光が揺れたが、敵影は現れなかった。",
        "暗闇の段落が一枚めくれ、何も起こらないまま閉じた。"
      ],
      hpRecovery: [
        "洞窟の鉱脈に残る治癒の記述を吸い上げ、HPが {amount} 回復した。",
        "岩壁の文字が温かな光となって流れ込み、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "青白い結晶片を砕いて吸収し、MPが {amount} 回復した。",
        "洞窟の深部から漏れた魔力の注釈を取り込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "治癒の記述はほどけたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "魔力の結晶は砕けたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "岩の裂け目に、赤い「Potion」データが挟まっていた。",
        manaPotion: "蒼い結晶の陰から、マナポーションの記述片を見つけた。"
      },
      advance: "洞窟の文脈をたどり、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "洞窟エリアクリア。崩れた岩壁の向こうで、新たな章の入口が低くうなった。"
  },
  desert: {
    id: "desert",
    name: "砂漠エリア",
    floors: { start: 21, end: 30 },
    enemies: ["scorpion", "cactusBozu", "desertShark"],
    bossId: "sandWorm",
    ambientLogs: [
      "砂丘の代わりに、乾いた文章が地平線まで積もっている。",
      "熱砂の上で、崩れかけた文字列が蜃気楼のように揺らめいた。",
      "乾いた風が行を削り、砂漠の段落を遠くまで運んでいく。",
      "照りつける光の中で、句読点のような石が熱を帯びている。",
      "地平の彼方で、砂の波が改行のようにうねった。"
    ],
    explorationTexts: {
      quiet: [
        "砂煙の向こうで文字列がほどけたが、何も現れなかった。",
        "乾いた風だけが吹き抜け、砂漠の一文は静かに続いていく。",
        "陽炎のような記述が揺れ、次の瞬間には空白へ戻った。"
      ],
      hpRecovery: [
        "砂の下に眠る温かな文章を掘り当て、HPが {amount} 回復した。",
        "灼けた石板の保護術式に触れ、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "蜃気楼に混じる魔力の記述を吸い上げ、MPが {amount} 回復した。",
        "乾いた空気に散る光る文字片を取り込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "癒やしの砂文字は消えたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "魔力の蜃気楼は揺らめいたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "砂の中から、熱を帯びた「Potion」データを掘り出した。",
        manaPotion: "青いガラス片に封じられたマナポーションの記述を見つけた。"
      },
      advance: "砂漠の行を踏みしめ、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "砂漠エリアクリア。砂嵐が割れ、潮の匂いを帯びた次の章が姿を現した。"
  },
  sea: {
    id: "sea",
    name: "海エリア",
    floors: { start: 31, end: 40 },
    enemies: ["deathShark", "kametos", "kuragezu"],
    bossId: "kraken",
    ambientLogs: [
      "青い文脈が波となって寄せ、泡のような文字が足元で砕けた。",
      "海面に浮かぶ文章が潮に揺れ、行末だけが白く弾けている。",
      "湿った風が吹き込み、遠くで水の章が唸るように開いた。",
      "淡い泡文字が水面を滑り、静かに砕けて余白へ沈んだ。",
      "深い海の底から、重い一文がゆっくり浮上してくる気配がした。"
    ],
    explorationTexts: {
      quiet: [
        "静かな波だけが揺れ、敵影は泡とともに消えた。",
        "潮騒が一行だけ響き、海は何事もなかったように凪いだ。",
        "水面に浮かんだ青い文字列は、触れる前にほどけて消えた。"
      ],
      hpRecovery: [
        "海流に混じる再生の文様に包まれ、HPが {amount} 回復した。",
        "澄んだ水文字が身体を洗い流し、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "泡の奥に眠る魔力の記述を吸収し、MPが {amount} 回復した。",
        "潮の満ち引きに混じる青い術式がほどけ、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "癒やしの波は寄せたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "魔力を帯びた潮騒は響いたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "浜辺に流れ着いた「Potion」の小瓶データを拾った。",
        manaPotion: "波間にきらめくマナポーションの記述片をすくい上げた。"
      },
      advance: "海の段落を渡り、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "海エリアクリア。荒れる波が割れ、灼熱を秘めた次の領域への航路が開いた。"
  },
  volcano: {
    id: "volcano",
    name: "火山エリア",
    floors: { start: 41, end: 50 },
    enemies: ["fireLizard", "magmaGolem", "flameBird"],
    bossId: "ifrit",
    ambientLogs: [
      "赤熱した注釈が火山帯を照らし、地面の行が赤く脈打っている。",
      "マグマの裂け目から、燃える単語が泡のように噴き上がった。",
      "熱風が吹き抜け、灼けた段落が視界の端で揺らめく。",
      "足元の岩盤に、ひび割れた火文字が走っている。",
      "火山の奥で、巨大な句点のような火口が明滅した。"
    ],
    explorationTexts: {
      quiet: [
        "灼熱の風だけが通り過ぎ、敵影は火花とともに消えた。",
        "火口の底で燃える文字が弾けたが、戦いにはならなかった。",
        "赤い煙が一文のように流れ、また火山の奥へ溶けていった。"
      ],
      hpRecovery: [
        "火山岩の奥に刻まれた再生の文様に触れ、HPが {amount} 回復した。",
        "熱を帯びたルーンが身体に宿り、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "噴き上がる火文字の魔力を吸収し、MPが {amount} 回復した。",
        "火口から漏れる力強い記述を取り込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "再生の熱は流れ込んだが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "灼熱の魔力は揺らめいたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "溶岩のそばに、熱を帯びた「Potion」データが転がっていた。",
        manaPotion: "火山石の陰から、赤く輝くマナポーションの記述片を拾った。"
      },
      advance: "火山の段落を登り、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "火山エリアクリア。火煙が晴れ、白銀の章が冷たい吐息とともに開いた。"
  },
  snow: {
    id: "snow",
    name: "雪エリア",
    floors: { start: 51, end: 60 },
    enemies: ["iceWolf", "snowGolem", "frostSpirit"],
    bossId: "iceDragon",
    ambientLogs: [
      "白い余白が一面を覆い、雪原の文章が静かに積もっている。",
      "凍った文字片が風に舞い、頬をかすめて砕け散った。",
      "雪の上には、誰もいないのに句読点の足跡だけが続いている。",
      "氷晶の柱が青く光り、行間に冷気を満たしていた。",
      "遠くで吹雪が渦を巻き、景色そのものを白紙へ戻そうとしている。"
    ],
    explorationTexts: {
      quiet: [
        "吹雪が一瞬だけ視界を閉ざしたが、敵は現れなかった。",
        "雪面に浮かんだ青い文字は、触れる前に凍って砕けた。",
        "静かな雪原に、ページをめくるような風の音だけが残った。"
      ],
      hpRecovery: [
        "氷の中に封じられた癒やしの文を解放し、HPが {amount} 回復した。",
        "雪原の清浄な気配が身体を包み、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "凍てつく魔力結晶を砕き、MPが {amount} 回復した。",
        "白銀の術式が呼吸に混じり、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "癒やしの雪は降り積もったが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "氷の魔力は砕けたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "雪の下から、冷たく光る「Potion」データを掘り出した。",
        manaPotion: "氷晶の中に封じられたマナポーションの記述を見つけた。"
      },
      advance: "雪原の白い文脈を進み、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "雪エリアクリア。吹雪の幕が裂け、甘くきらめく妖精の章が姿を現した。"
  },
  fairy: {
    id: "fairy",
    name: "妖精エリア",
    floors: { start: 61, end: 70 },
    enemies: ["pixie", "mandragora", "elderTreant"],
    bossId: "fairyQueen",
    ambientLogs: [
      "妖精語のような小さな文字が、光の粒となって空に舞っている。",
      "花弁の代わりに色鮮やかな句読点が舞い、森を虹色に染めた。",
      "甘い歌声のような行が流れ、景色そのものが軽やかに跳ねた。",
      "古木の幹には、妖精の書式で編まれた文が脈打っている。",
      "遠くで鈴の音がし、可憐な章がそっと開いた。"
    ],
    explorationTexts: {
      quiet: [
        "笑い声のような文字列だけが跳ね、また木漏れ日の中へ消えた。",
        "花の上に座った妖精文字が手を振ったが、戦いにはならなかった。",
        "透明な音符のような記述が漂い、静かに余白へ溶けた。"
      ],
      hpRecovery: [
        "妖精の祝福がやわらかな光になって降り、HPが {amount} 回復した。",
        "花の注釈が身体を包み、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "きらめく鱗粉の文字を吸い込み、MPが {amount} 回復した。",
        "妖精の囁きが術式となり、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "祝福の光は降りたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "妖精の魔力は舞ったが、MPはすでに満ちていた。",
      itemFind: {
        potion: "花の根元に、小さな「Potion」データが隠されていた。",
        manaPotion: "妖精の輪の中に、淡く光るマナポーションの記述があった。"
      },
      advance: "妖精郷の詩を読み進め、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "妖精エリアクリア。きらめく光輪の向こうに、蒼穹へ続く章が開いた。"
  },
  sky: {
    id: "sky",
    name: "天空エリア",
    floors: { start: 71, end: 80 },
    enemies: ["harpy", "thunderBird", "airElement"],
    bossId: "griffon",
    ambientLogs: [
      "雲海のかわりに、薄い段落が空へ幾重にも重なっている。",
      "風の見出しが高く鳴り、青空に流れる行を押し上げていく。",
      "白い雲文字が流れ、天空の余白をゆっくり塗り替えていた。",
      "足元の風が頁をめくるように渦を巻く。",
      "雷を帯びた一文が遠くの空で瞬いた。"
    ],
    explorationTexts: {
      quiet: [
        "雲の上を風だけが走り抜け、敵影は残らなかった。",
        "高空に浮かぶ文字列が崩れ、静かな青だけが広がった。",
        "一羽の影が見えたが、すぐに空の文脈へ紛れて消えた。"
      ],
      hpRecovery: [
        "澄んだ風が身体を貫き、HPが {amount} 回復した。",
        "天空の光が傷を洗い流し、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "空を満たす魔力の気流を吸い込み、MPが {amount} 回復した。",
        "雲の奥の雷文字を取り込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "癒やしの風は吹いたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "空の魔力は巡ったが、MPはすでに満ちていた。",
      itemFind: {
        potion: "雲の切れ間から、「Potion」の小瓶データが落ちてきた。",
        manaPotion: "風に運ばれたマナポーションの記述片をつかみ取った。"
      },
      advance: "天空の階文を越え、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "天空エリアクリア。空の彼方に、神々しい白光の章が降りてきた。"
  },
  divine: {
    id: "divine",
    name: "神域エリア",
    floors: { start: 81, end: 90 },
    enemies: ["seraphimGuard", "holyBeast", "judgementEye"],
    bossId: "dominion",
    ambientLogs: [
      "神域の白い見出しが脈打ち、空気そのものが厳かな書式に変わっていく。",
      "足元の光輪に、神名めいた文字が淡く浮かんでは消えた。",
      "清浄な鐘の音が響き、章全体が祈りのように震えた。",
      "遥か上空で、審判の句点が静かに開眼する気配がした。",
      "まばゆい光が行間を満たし、息をのむほどの静けさが降りた。"
    ],
    explorationTexts: {
      quiet: [
        "神聖な気配だけが満ち、戦いの影は現れなかった。",
        "白い光の文が空でほどけ、神域は再び沈黙した。",
        "祈りのような記述が通り過ぎ、何も起こらないまま消えた。"
      ],
      hpRecovery: [
        "浄化の光が降り注ぎ、HPが {amount} 回復した。",
        "神域の加護が身体を包み、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "聖なる術式が胸の奥で灯り、MPが {amount} 回復した。",
        "白光の注釈が精神を満たし、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "加護は降りたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "聖なる力は流れたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "祭壇の上に、「Potion」の祝福データが置かれていた。",
        manaPotion: "神域の光に浮かぶマナポーションの記述片を手に入れた。"
      },
      advance: "神域の白き文を踏み越え、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "神域エリアクリア。祝福の光が薄れ、その先に終末の黒い章が口を開けた。"
  },
  apocalypse: {
    id: "apocalypse",
    name: "終末エリア",
    floors: { start: 91, end: 99 },
    enemies: ["voidKnight", "collapseBeast", "abyssWorm"],
    bossId: "nemesis",
    ambientLogs: [
      "終末の章題が空を覆い、崩れた文字の灰が静かに降っている。",
      "空間そのものが罅割れ、欠けた一文が奈落へ落ちていった。",
      "黒い風が吹き、世界の行末を削り取っていく。",
      "遠くで崩壊の咆哮が響き、景色全体が揺らいだ。",
      "底知れぬ闇の中で、終わりの句点がゆっくり膨らんでいく。"
    ],
    explorationTexts: {
      quiet: [
        "崩壊の気配だけが通り過ぎ、まだ戦いは始まらなかった。",
        "虚ろな風が世界の切れ端を運び、何事もなく闇に消えた。",
        "闇の底で何かがうごめいたが、姿は見せなかった。"
      ],
      hpRecovery: [
        "終末の縁で逆説的な再生の文を見つけ、HPが {amount} 回復した。",
        "崩れた世界の断片が力へ変わり、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "奈落に漂う濃密な記述を吸収し、MPが {amount} 回復した。",
        "虚無の奥の黒い術式を取り込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "再生の逆説は働いたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "虚無の魔力は満ちたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "崩壊した祭器の中から、「Potion」データを拾い上げた。",
        manaPotion: "闇の裂け目に、濃いマナポーションの記述が浮いていた。"
      },
      advance: "終末の黒い章を進み、ハルトは {floor}階 へ進んだ。"
    },
    completionMessage: "終末エリアクリア。崩壊の向こうに、世界の起点たる最終章が姿を現した。"
  },
  creator: {
    id: "creator",
    name: "創造神モジール",
    floors: { start: 100, end: 100 },
    enemies: [],
    bossId: "mojiru",
    ambientLogs: [
      "最終階の見出しが静かに脈打ち、世界の原文が呼吸している。",
      "白紙と文字列の境界で、創造の音がかすかに響いた。"
    ],
    explorationTexts: {
      quiet: ["創造神の気配だけが満ち、世界は最後の一頁を待っている。"],
      hpRecovery: [
        "原初の光が傷をなぞり、HPが {amount} 回復した。"
      ],
      mpRecovery: [
        "世界を生んだ術式の残響を吸い込み、MPが {amount} 回復した。"
      ],
      hpRecoveryNoEffect: "原初の光は降りたが、HPはすでに満ちていた。",
      mpRecoveryNoEffect: "創造の力は満ちたが、MPはすでに満ちていた。",
      itemFind: {
        potion: "白紙の縁から、「Potion」の原型データが現れた。",
        manaPotion: "創造の余白に、マナポーションの根源記述が浮かんだ。"
      },
      advance: "最終階の文脈はこれ以上先へは進まない。"
    },
    completionMessage: "創造神モジールを討ち果たした。塔を縛っていた原文は書き換わり、ハルトは真のエンディングへ辿り着いた。"
  }
};

const explorationEventData = [
  {
    id: "flavor_breeze",
    type: "flavor",
    text: "文字でできた風が、静かにページをめくるように吹き抜けた。",
    weight: 16
  },
  {
    id: "flavor_unread",
    type: "flavor",
    text: "遠くで、まだ読まれていない文章が揺れている。",
    weight: 14
  },
  {
    id: "rest_blank_line",
    type: "recovery",
    text: "休息できる空白行を見つけた。少し落ち着いた。",
    weight: 12,
    effect: {
      type: "randomResult",
      results: [
        { weight: 1, effect: { type: "hpHeal", min: 3, max: 6 }, resultText: "HPが回復した。" },
        { weight: 1, effect: { type: "mpHeal", min: 3, max: 6 }, resultText: "MPが回復した。" }
      ]
    }
  },
  {
    id: "recover_code_hp",
    type: "recovery",
    text: "不安定なコード片を吸収した。",
    weight: 10,
    effect: { type: "hpHeal", min: 2, max: 5 }
  },
  {
    id: "recover_text_mp",
    type: "recovery",
    text: "柔らかな光を帯びた文章に触れた。",
    weight: 10,
    effect: { type: "mpHeal", min: 2, max: 5 }
  },
  {
    id: "item_fragment",
    type: "item",
    text: "地面に「Potion」と記されたデータ片が落ちていた。",
    weight: 8,
    effect: { type: "gainItem", itemId: "potion", amount: 1 }
  },
  {
    id: "item_mana_crack",
    type: "item",
    text: "崩れた構文の中からマナポーションを見つけた。",
    weight: 7,
    effect: { type: "gainItem", itemId: "manaPotion", amount: 1 }
  },
  {
    id: "risk_corrupted_zone",
    type: "risk",
    text: "文字化けした領域に足を踏み入れた。",
    weight: 8,
    effect: { type: "hpDamage", min: 2, max: 5 }
  },
  {
    id: "risk_broken_page",
    type: "risk",
    text: "不安定なページに飲まれかけた。",
    weight: 6,
    effect: {
      type: "randomResult",
      results: [
        { weight: 2, effect: { type: "mpDamage", min: 2, max: 4 }, resultText: "MPが乱れた。" },
        { weight: 1, effect: { type: "gainItem", itemId: "potion", amount: 1 }, resultText: "だが、ポーションを拾えた。" }
      ]
    }
  },
  {
    id: "choice_forbidden_text",
    type: "choice",
    text: "怪しい文章の断片が落ちている。読むか、無視するか。",
    weight: 7,
    choices: [
      {
        id: "read",
        label: "読む",
        resultText: "禁じられた文章を読んだ。",
        effect: {
          type: "randomResult",
          results: [
            { weight: 2, effect: { type: "randomResult", results: [
              { weight: 1, effect: { type: "giveXp", min: 18, max: 36 }, resultText: "知識を得てXPが増えた。" },
              { weight: 1, effect: { type: "addFlag", flag: "readForbiddenText" }, resultText: "禁書の余白が脳裏に刻まれた。" }
            ] }, resultText: "知識を得てXPが増えた。" },
            { weight: 1, effect: { type: "addStatus", statusId: "paralysis", chance: 0.65 }, resultText: "記述の反動で身体がしびれた。" },
            { weight: 1, effect: { type: "triggerBattle", chance: 1 }, resultText: "文字列が集まり、敵の輪郭を作り始めた。" }
          ]
        }
      },
      {
        id: "ignore",
        label: "無視する",
        resultText: "断片を無視して歩みを進めた。",
        effect: { type: "addFlag", flag: "refusedFalseChoice" }
      }
    ]
  },
  {
    id: "choice_broken_chest",
    type: "choice",
    text: "壊れた宝箱がある。開けるか、立ち去るか。",
    weight: 6,
    choices: [
      {
        id: "open",
        label: "開ける",
        resultText: "箱の残骸をこじ開けた。",
        effect: {
          type: "randomResult",
          results: [
            { weight: 2, effect: { type: "gainItem", itemId: "potion", amount: 1 }, resultText: "ポーションを見つけた。" },
            { weight: 2, effect: { type: "gainItem", itemId: "manaPotion", amount: 1 }, resultText: "マナポーションを見つけた。" },
            { weight: 1, effect: { type: "hpDamage", min: 2, max: 4 }, resultText: "罠が作動し、HPが削られた。" }
          ]
        }
      },
      {
        id: "leave",
        label: "立ち去る",
        resultText: "危険を避けて先へ進んだ。",
        effect: { type: "none" }
      }
    ]
  },
  {
    id: "combat_omen",
    type: "omen",
    text: "不自然な空白の向こうから、敵意が滲む。",
    weight: 10,
    effect: { type: "triggerBattle", chance: 0.85 }
  },
  {
    id: "rewrite_name_glimpse",
    type: "special",
    text: "ハルトの名前が一瞬だけ別の文字列に変わった。",
    weight: 4,
    minFloor: 61,
    effect: { type: "addFlag", flag: "sawRewriteEvent" }
  },
  {
    id: "forest_leaf_script",
    type: "flavor",
    text: "文字の葉が揺れ、森の文が静かに組み替わった。",
    weight: 6,
    areaIds: ["forest"]
  },
  {
    id: "cave_unread_line",
    type: "flavor",
    text: "洞窟の壁に未読の行が浮かび、すぐに闇へ沈んだ。",
    weight: 6,
    areaIds: ["cave"]
  },
  {
    id: "desert_eroded_text",
    type: "risk",
    text: "削れた文章に触れ、乾いたノイズが身体を走った。",
    weight: 6,
    areaIds: ["desert"],
    effect: { type: "mpDamage", min: 2, max: 4 }
  },
  {
    id: "sea_wavy_script",
    type: "recovery",
    text: "波打つ記述が体表を流れ、魔力が整った。",
    weight: 6,
    areaIds: ["sea"],
    effect: { type: "mpHeal", min: 3, max: 6 }
  },
  {
    id: "volcano_burning_text",
    type: "risk",
    text: "燃える文字列が弾け、熱い火花が降り注いだ。",
    weight: 6,
    areaIds: ["volcano"],
    effect: { type: "hpDamage", min: 3, max: 6 }
  },
  {
    id: "snow_frozen_word",
    type: "recovery",
    text: "凍った単語を砕くと、澄んだ余白が広がった。",
    weight: 6,
    areaIds: ["snow"],
    effect: { type: "hpHeal", min: 3, max: 6 }
  },
  {
    id: "fairy_decorated_phrase",
    type: "special",
    text: "装飾された文が舞い、甘い幻惑が視界をかすめる。",
    weight: 5,
    areaIds: ["fairy"],
    effect: { type: "addStatus", statusId: "blind", chance: 0.35 }
  },
  {
    id: "sky_blank_rows",
    type: "item",
    text: "空白行の継ぎ目から小さなデータ片を拾った。",
    weight: 5,
    areaIds: ["sky"],
    effect: { type: "gainItem", itemId: "manaPotion", amount: 1 }
  },
  {
    id: "divine_perfect_syntax",
    type: "special",
    text: "完璧すぎる構文に触れ、僅かな加護を得た。",
    weight: 5,
    areaIds: ["divine"],
    effect: { type: "giveSp", min: 1, max: 1 }
  },
  {
    id: "apocalypse_missing_sentence",
    type: "omen",
    text: "文法が崩れ、文章の核心がごっそり欠け落ちている……",
    weight: 7,
    areaIds: ["apocalypse"],
    effect: { type: "triggerBattle", chance: 0.92 }
  },
  {
    id: "end_error_pulse",
    type: "special",
    text: "---- ERROR : TEXT COLLAPSE ----",
    weight: 5,
    areaIds: ["apocalypse", "creator", "endless"],
    effect: {
      type: "randomResult",
      results: [
        { weight: 1, effect: { type: "giveSp", min: 1, max: 2 }, resultText: "崩壊の隙間からSPが漏れ出した。" },
        { weight: 2, effect: { type: "mpDamage", min: 2, max: 5 }, resultText: "記述干渉でMPが乱れた。" }
      ]
    }
  },
  {
    id: "hidden_unknown_symbol",
    type: "choice",
    text: "壁の奥で未知の記号が脈打っている。触れるか、見送るか。",
    weight: 2,
    minFloor: 21,
    choices: [
      {
        id: "touch",
        label: "触れる",
        resultText: "記号がハルトの手に吸い付き、意味のないはずの記憶が流れ込む。",
        effect: {
          type: "randomResult",
          results: [
            { weight: 2, effect: { type: "addFlag", flag: "touchedUnknownSymbol" }, resultText: "未知の記号を刻み込んだ。" },
            { weight: 1, effect: { type: "hpDamage", min: 4, max: 7 }, resultText: "侵食が走り、HPが削られた。" }
          ]
        }
      },
      {
        id: "leave",
        label: "見送る",
        resultText: "記号は行間へ沈み、何事もなかったように静まった。",
        effect: { type: "none" }
      }
    ]
  },
  {
    id: "hidden_broken_page",
    type: "special",
    text: "存在しないはずのページが一枚、足元に落ちていた。",
    weight: 1,
    minFloor: 41,
    maxFloor: 95,
    effect: { type: "addFlag", flag: "foundBrokenPage" }
  },
  {
    id: "hidden_voice",
    type: "special",
    text: "「君はまだ、本文しか読んでいない」誰のものでもない声が、ログに混ざった。",
    weight: 1,
    minFloor: 71,
    effect: {
      type: "randomResult",
      results: [
        { weight: 2, effect: { type: "addFlag", flag: "heardHiddenVoice" }, resultText: "声は二度と同じ文を繰り返さなかった。" },
        { weight: 1, effect: { type: "giveSp", min: 1, max: 2 }, resultText: "声は痕跡だけを残し、SPが滲み出た。" }
      ]
    }
  },
  {
    id: "hidden_memory_echo",
    type: "special",
    text: "ハルトは一瞬、見覚えのないはずの帰り道を思い出した。",
    weight: 2,
    minFloor: 91,
    condition: { flagRequired: "heardHiddenVoice" },
    effect: { type: "addFlag", flag: "rememberedOriginalWorld" }
  },
  {
    id: "hidden_mojiru_preface",
    type: "special",
    text: "最終行の手前で、黒い余白が囁く。「創造神のさらに外側を見よ」",
    weight: 3,
    areaIds: ["creator"],
    condition: { flagRequired: "foundBrokenPage" },
    effect: { type: "addFlag", flag: "metUnknownEntity" }
  },
  {
    id: "hard_trace_event",
    type: "special",
    text: "Hardの行間でだけ読める注記が浮かぶ。「痛みは記憶を強くする」",
    weight: 2,
    minFloor: 31,
    condition: { difficultyIn: ["hard"] },
    effect: {
      type: "randomResult",
      results: [
        { weight: 2, effect: { type: "giveXp", min: 24, max: 48 }, resultText: "痛みの代償としてXPを得た。" },
        { weight: 1, effect: { type: "hpDamage", min: 4, max: 8 }, resultText: "注記は代償を求め、HPが削られた。" }
      ]
    }
  },
  {
    id: "cycle_hidden_whisper",
    type: "special",
    text: "「また来たのか」既読のはずの余白が、周回したハルトにだけ応答した。",
    weight: 2,
    minFloor: 11,
    condition: { cycleMin: 1, flagAbsent: "heardHiddenVoice" },
    effect: { type: "addFlag", flag: "heardHiddenVoice" }
  }
];

const enemyData = {
  goblin: {
    id: "goblin",
    name: "ゴブリン",
    maxHp: 8,
    attackMin: 1,
    attackMax: 3,
    xp: 35,
    dropTable: [
      { itemId: "potion", chance: 0.18 },
      { itemId: "manaPotion", chance: 0.1 }
    ],
    appearText: "ゴブリンが現れた！",
    defeatText: "ゴブリンは悲鳴の代わりに文字の破片を散らし、行の外へ消えた。"
  },
  wolf: {
    id: "wolf",
    name: "ウルフ",
    maxHp: 10,
    attackMin: 2,
    attackMax: 4,
    xp: 45,
    dropTable: [
      { itemId: "potion", chance: 0.14 },
      { itemId: "manaPotion", chance: 0.16 }
    ],
    appearText: "ウルフが低いうなり声とともに現れた！",
    defeatText: "ウルフの輪郭が崩れ、灰色の単語となって夜気に溶ける。"
  },
  slime: {
    id: "slime",
    name: "スライム",
    maxHp: 7,
    attackMin: 1,
    attackMax: 2,
    xp: 30,
    dropTable: [
      { itemId: "potion", chance: 0.12 },
      { itemId: "manaPotion", chance: 0.2 }
    ],
    appearText: "スライムがぷるりと震え、文字列の塊として迫ってきた！",
    defeatText: "スライムの輪郭が崩れ、文字列となって消えていく。"
  },
  orc: {
    id: "orc",
    name: "オーク",
    maxHp: 18,
    attackMin: 3,
    attackMax: 5,
    xp: 120,
    isBoss: true,
    dropTable: [
      { itemId: "potion", chance: 0.5 },
      { itemId: "manaPotion", chance: 0.5 }
    ],
    appearText: "10階の主、オークが森の文面を裂くように現れた！",
    defeatText: "オークは重い断末魔を残し、太いフォントの残骸となって崩れ落ちた。"
  },
  skeleton: {
    id: "skeleton",
    name: "スケルトン",
    maxHp: 14,
    attackMin: 3,
    attackMax: 5,
    xp: 55,
    dropTable: [
      { itemId: "potion", chance: 0.16 },
      { itemId: "manaPotion", chance: 0.16 }
    ],
    appearText: "スケルトンが乾いた骨音を鳴らし、洞窟の文章から歩み出た！",
    defeatText: "スケルトンは骨組みごと崩れ、白い記号の粉となって散った。"
  },
  zombie: {
    id: "zombie",
    name: "ゾンビ",
    maxHp: 18,
    attackMin: 2,
    attackMax: 4,
    xp: 65,
    dropTable: [
      { itemId: "potion", chance: 0.22 },
      { itemId: "manaPotion", chance: 0.1 }
    ],
    appearText: "ゾンビが途切れた文章をうめき声に変え、闇の中から現れた！",
    defeatText: "ゾンビの肉片は黒いインクとなり、地面へ滲んで消えた。"
  },
  darkBat: {
    id: "darkBat",
    name: "ダークバット",
    maxHp: 10,
    attackMin: 2,
    attackMax: 5,
    xp: 60,
    evadeChance: 0.24,
    dropTable: [
      { itemId: "potion", chance: 0.08 },
      { itemId: "manaPotion", chance: 0.24 }
    ],
    appearText: "ダークバットが黒い句読点の群れのように飛来した！",
    defeatText: "ダークバットは影の一文字となって裂け、暗闇へ吸い込まれた。"
  },
  golem: {
    id: "golem",
    name: "ゴーレム",
    maxHp: 30,
    attackMin: 4,
    attackMax: 7,
    xp: 180,
    isBoss: true,
    defense: 1,
    skillIds: ["defenseUp"],
    dropTable: [
      { itemId: "potion", chance: 0.6 },
      { itemId: "manaPotion", chance: 0.55 }
    ],
    appearText: "20階の主、ゴーレムが岩壁の段落を砕きながら起動した！",
    defeatText: "ゴーレムは重い轟音とともに崩れ、石片の文字群となって洞窟へ埋もれた。"
  },
  scorpion: {
    id: "scorpion",
    name: "スコーピオン",
    maxHp: 18,
    attackMin: 4,
    attackMax: 6,
    xp: 72,
    traits: { poisonReady: true },
    skillIds: ["poisonSting"],
    dropTable: [
      { itemId: "potion", chance: 0.16 },
      { itemId: "manaPotion", chance: 0.12 }
    ],
    appearText: "スコーピオンが灼けた砂を跳ね上げ、毒々しい尾を掲げた！",
    defeatText: "スコーピオンは尾の記号を散らし、砂の上で乾いた文字片へ崩れた。"
  },
  cactusBozu: {
    id: "cactusBozu",
    name: "サボテンボーズ",
    maxHp: 20,
    attackMin: 3,
    attackMax: 5,
    xp: 76,
    defense: 1,
    dropTable: [
      { itemId: "potion", chance: 0.2 },
      { itemId: "manaPotion", chance: 0.1 }
    ],
    appearText: "サボテンボーズが無数の針文字を揺らし、砂丘の陰から現れた！",
    defeatText: "サボテンボーズは乾いた破裂音とともに裂け、緑の句点となって散った。"
  },
  desertShark: {
    id: "desertShark",
    name: "デザートシャーク",
    maxHp: 16,
    attackMin: 5,
    attackMax: 7,
    xp: 84,
    dropTable: [
      { itemId: "potion", chance: 0.12 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "デザートシャークが砂の海を裂き、下から一気に食らいついてきた！",
    defeatText: "デザートシャークは砂の波へ沈み、荒れた単語だけを残して消えた。"
  },
  sandWorm: {
    id: "sandWorm",
    name: "サンドワーム",
    maxHp: 38,
    attackMin: 6,
    attackMax: 9,
    xp: 220,
    isBoss: true,
    skillIds: ["devour"],
    dropTable: [
      { itemId: "potion", chance: 0.65 },
      { itemId: "manaPotion", chance: 0.55 }
    ],
    appearText: "30階の主、サンドワームが砂漠そのものを盛り上げて姿を現した！",
    defeatText: "サンドワームは巨大なうねりを残して崩れ、砂粒のような文字列へ還っていった。"
  },
  deathShark: {
    id: "deathShark",
    name: "デスシャーク",
    maxHp: 22,
    attackMin: 5,
    attackMax: 8,
    xp: 92,
    dropTable: [
      { itemId: "potion", chance: 0.14 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "デスシャークが波を断ち、鋭い牙の列を見せつけて迫った！",
    defeatText: "デスシャークは黒い飛沫の文字を散らし、海の行間へ沈んだ。"
  },
  kametos: {
    id: "kametos",
    name: "カメートス",
    maxHp: 26,
    attackMin: 3,
    attackMax: 5,
    xp: 88,
    defense: 2,
    dropTable: [
      { itemId: "potion", chance: 0.2 },
      { itemId: "manaPotion", chance: 0.12 }
    ],
    appearText: "カメートスが重い甲羅の文様を軋ませ、ゆっくりと海辺へにじり出た！",
    defeatText: "カメートスの甲羅はひび割れ、青い断片の文字群となって崩れ落ちた。"
  },
  kuragezu: {
    id: "kuragezu",
    name: "クラゲーズ",
    maxHp: 18,
    attackMin: 4,
    attackMax: 7,
    xp: 90,
    evadeChance: 0.12,
    traits: { magicLike: true },
    skillIds: ["paralysisPulse"],
    dropTable: [
      { itemId: "potion", chance: 0.1 },
      { itemId: "manaPotion", chance: 0.24 }
    ],
    appearText: "クラゲーズが青白い放電めいた文字をまとい、海上に浮かび上がった！",
    defeatText: "クラゲーズは淡い電光の記述を残し、泡の中へほどけて消えた。"
  },
  kraken: {
    id: "kraken",
    name: "クラーケン",
    maxHp: 44,
    attackMin: 4,
    attackMax: 7,
    attackHitsMin: 1,
    attackHitsMax: 2,
    xp: 260,
    isBoss: true,
    skillIds: ["crush"],
    dropTable: [
      { itemId: "potion", chance: 0.68 },
      { itemId: "manaPotion", chance: 0.62 }
    ],
    appearText: "40階の主、クラーケンが海の章を裂き、幾本もの触腕文字を広げて浮上した！",
    defeatText: "クラーケンは海を震わせながら崩れ、巨大な墨色の文章となって波へ沈んだ。"
  },
  fireLizard: {
    id: "fireLizard",
    name: "ファイアリザード",
    maxHp: 28,
    attackMin: 6,
    attackMax: 9,
    xp: 108,
    skillIds: ["burnStrike"],
    dropTable: [
      { itemId: "potion", chance: 0.16 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "ファイアリザードが赤熱した鱗を鳴らし、火口の縁から飛び出した！",
    defeatText: "ファイアリザードは燃える鱗文字を散らし、灰となって崩れた。"
  },
  magmaGolem: {
    id: "magmaGolem",
    name: "マグマゴーレム",
    maxHp: 34,
    attackMin: 5,
    attackMax: 8,
    xp: 114,
    defense: 2,
    dropTable: [
      { itemId: "potion", chance: 0.18 },
      { itemId: "manaPotion", chance: 0.14 }
    ],
    appearText: "マグマゴーレムが溶岩の中からせり上がり、熱い岩腕を振り上げた！",
    defeatText: "マグマゴーレムはひび割れた岩文字へ戻り、溶岩の中へ沈んだ。"
  },
  flameBird: {
    id: "flameBird",
    name: "フレイムバード",
    maxHp: 24,
    attackMin: 7,
    attackMax: 10,
    xp: 118,
    evadeChance: 0.14,
    skillIds: ["burnStrike"],
    dropTable: [
      { itemId: "potion", chance: 0.12 },
      { itemId: "manaPotion", chance: 0.22 }
    ],
    appearText: "フレイムバードが火の羽ばたきとともに頭上を裂いた！",
    defeatText: "フレイムバードは火の羽根を文字片に変え、赤い空気へ溶けていった。"
  },
  ifrit: {
    id: "ifrit",
    name: "イフリート",
    maxHp: 52,
    attackMin: 8,
    attackMax: 12,
    xp: 320,
    isBoss: true,
    skillIds: ["burnStrike", "crush"],
    dropTable: [
      { itemId: "potion", chance: 0.72 },
      { itemId: "manaPotion", chance: 0.66 }
    ],
    appearText: "50階の主、イフリートが火山の一文そのものをまとって顕現した！",
    defeatText: "イフリートは灼熱の章ごと砕け、炎の残滓を散らして消滅した。"
  },
  iceWolf: {
    id: "iceWolf",
    name: "アイスウルフ",
    maxHp: 30,
    attackMin: 7,
    attackMax: 10,
    xp: 126,
    dropTable: [
      { itemId: "potion", chance: 0.16 },
      { itemId: "manaPotion", chance: 0.2 }
    ],
    appearText: "アイスウルフが白い吐息とともに雪原を駆けてきた！",
    defeatText: "アイスウルフは氷片の単語へ砕け、吹雪の向こうへ散った。"
  },
  snowGolem: {
    id: "snowGolem",
    name: "スノーゴーレム",
    maxHp: 36,
    attackMin: 6,
    attackMax: 9,
    xp: 132,
    defense: 2,
    dropTable: [
      { itemId: "potion", chance: 0.2 },
      { itemId: "manaPotion", chance: 0.14 }
    ],
    appearText: "スノーゴーレムが凍った巨体を軋ませ、雪中から立ち上がった！",
    defeatText: "スノーゴーレムは白い塊ごと崩れ、冷たい記号だけを残した。"
  },
  frostSpirit: {
    id: "frostSpirit",
    name: "フロストスピリット",
    maxHp: 26,
    attackMin: 8,
    attackMax: 11,
    xp: 138,
    evadeChance: 0.1,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.1 },
      { itemId: "manaPotion", chance: 0.24 }
    ],
    appearText: "フロストスピリットが青白い冷気とともに浮かび上がった！",
    defeatText: "フロストスピリットは霧のような文字列となり、静かに薄れていった。"
  },
  iceDragon: {
    id: "iceDragon",
    name: "アイスドラゴン",
    maxHp: 58,
    attackMin: 8,
    attackMax: 13,
    xp: 360,
    isBoss: true,
    attackHitsMin: 1,
    attackHitsMax: 2,
    dropTable: [
      { itemId: "potion", chance: 0.72 },
      { itemId: "manaPotion", chance: 0.68 }
    ],
    appearText: "60階の主、アイスドラゴンが白銀の翼で吹雪を裂いて舞い降りた！",
    defeatText: "アイスドラゴンは氷の咆哮を残し、砕けた結晶文となって崩れ落ちた。"
  },
  pixie: {
    id: "pixie",
    name: "ピクシー",
    maxHp: 24,
    attackMin: 7,
    attackMax: 10,
    xp: 142,
    evadeChance: 0.22,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.12 },
      { itemId: "manaPotion", chance: 0.26 }
    ],
    appearText: "ピクシーがきらめく文字粉を振りまきながら現れた！",
    defeatText: "ピクシーは笑い声のような文字を残し、光の粒へほどけた。"
  },
  mandragora: {
    id: "mandragora",
    name: "マンドラゴラ",
    maxHp: 34,
    attackMin: 7,
    attackMax: 9,
    xp: 148,
    dropTable: [
      { itemId: "potion", chance: 0.18 },
      { itemId: "manaPotion", chance: 0.16 }
    ],
    appearText: "マンドラゴラが根を引きずり、甲高い記述を響かせて飛び出した！",
    defeatText: "マンドラゴラは草の句読点を散らし、土へ還るように沈んだ。"
  },
  elderTreant: {
    id: "elderTreant",
    name: "エルダートレント",
    maxHp: 40,
    attackMin: 6,
    attackMax: 10,
    xp: 156,
    defense: 2,
    dropTable: [
      { itemId: "potion", chance: 0.2 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "エルダートレントが古木の文を軋ませ、森の奥から姿を現した！",
    defeatText: "エルダートレントは年輪の文章ごと砕け、木片の記述へ崩れた。"
  },
  fairyQueen: {
    id: "fairyQueen",
    name: "フェアリークイーン",
    maxHp: 60,
    attackMin: 9,
    attackMax: 12,
    xp: 390,
    isBoss: true,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.74 },
      { itemId: "manaPotion", chance: 0.72 }
    ],
    appearText: "70階の主、フェアリークイーンが無数の輝く文を従えて舞い降りた！",
    defeatText: "フェアリークイーンは虹色の文字列となって空へほどけ、静かな祝福だけを残した。"
  },
  harpy: {
    id: "harpy",
    name: "ハーピー",
    maxHp: 30,
    attackMin: 8,
    attackMax: 11,
    xp: 164,
    evadeChance: 0.18,
    dropTable: [
      { itemId: "potion", chance: 0.14 },
      { itemId: "manaPotion", chance: 0.2 }
    ],
    appearText: "ハーピーが鋭い鳴き声とともに高空から襲いかかった！",
    defeatText: "ハーピーは羽根の文字片を散らし、風の向こうへ消えた。"
  },
  thunderBird: {
    id: "thunderBird",
    name: "サンダーバード",
    maxHp: 32,
    attackMin: 9,
    attackMax: 12,
    xp: 170,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.12 },
      { itemId: "manaPotion", chance: 0.24 }
    ],
    appearText: "サンダーバードが雷の文をまとい、空から急降下してきた！",
    defeatText: "サンダーバードは閃光の記述を残し、雲海の彼方へ散った。"
  },
  airElement: {
    id: "airElement",
    name: "エアエレメント",
    maxHp: 28,
    attackMin: 8,
    attackMax: 11,
    xp: 168,
    evadeChance: 0.2,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.1 },
      { itemId: "manaPotion", chance: 0.22 }
    ],
    appearText: "エアエレメントが風の段落を巻き込み、透明な刃となって迫る！",
    defeatText: "エアエレメントは渦巻く文字列を残し、空気へ溶けた。"
  },
  griffon: {
    id: "griffon",
    name: "グリフォン",
    maxHp: 64,
    attackMin: 10,
    attackMax: 14,
    xp: 430,
    isBoss: true,
    attackHitsMin: 1,
    attackHitsMax: 2,
    dropTable: [
      { itemId: "potion", chance: 0.76 },
      { itemId: "manaPotion", chance: 0.72 }
    ],
    appearText: "80階の主、グリフォンが王者の咆哮とともに天空の頁を裂いた！",
    defeatText: "グリフォンは金色の羽文字を散らし、蒼穹の彼方へ落ちていった。"
  },
  seraphimGuard: {
    id: "seraphimGuard",
    name: "セラフィムガード",
    maxHp: 38,
    attackMin: 10,
    attackMax: 13,
    xp: 178,
    defense: 2,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.16 },
      { itemId: "manaPotion", chance: 0.22 }
    ],
    appearText: "セラフィムガードが白い翼を広げ、神域の門前に立ちはだかった！",
    defeatText: "セラフィムガードは光の羽音を残し、無数の聖句へ還った。"
  },
  holyBeast: {
    id: "holyBeast",
    name: "ホーリービースト",
    maxHp: 42,
    attackMin: 9,
    attackMax: 14,
    xp: 186,
    dropTable: [
      { itemId: "potion", chance: 0.18 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "ホーリービーストが神々しい咆哮で空気を震わせた！",
    defeatText: "ホーリービーストは輝く残響を残し、聖なる文字片へ砕けた。"
  },
  judgementEye: {
    id: "judgementEye",
    name: "ジャッジメントアイ",
    maxHp: 34,
    attackMin: 10,
    attackMax: 14,
    xp: 190,
    traits: { magicLike: true },
    dropTable: [
      { itemId: "potion", chance: 0.1 },
      { itemId: "manaPotion", chance: 0.26 }
    ],
    appearText: "ジャッジメントアイが白い瞳孔を開き、審判の光を向けてきた！",
    defeatText: "ジャッジメントアイは眩い線となってほどけ、光の中へ消えた。"
  },
  dominion: {
    id: "dominion",
    name: "ドミニオン",
    maxHp: 72,
    attackMin: 11,
    attackMax: 15,
    xp: 480,
    isBoss: true,
    traits: { magicLike: true },
    attackHitsMin: 1,
    attackHitsMax: 2,
    dropTable: [
      { itemId: "potion", chance: 0.78 },
      { itemId: "manaPotion", chance: 0.74 }
    ],
    appearText: "90階の主、ドミニオンが審判の白光とともに降臨した！",
    defeatText: "ドミニオンは神罰の文章を散らし、白い余白へ溶けるように消えた。"
  },
  voidKnight: {
    id: "voidKnight",
    name: "虚無の騎士",
    maxHp: 44,
    attackMin: 11,
    attackMax: 15,
    xp: 198,
    defense: 2,
    dropTable: [
      { itemId: "potion", chance: 0.16 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "虚無の騎士が黒い鎧文を軋ませ、終末の闇から現れた！",
    defeatText: "虚無の騎士は鎧ごと崩れ、空洞の文字だけを残して消えた。"
  },
  collapseBeast: {
    id: "collapseBeast",
    name: "崩界獣",
    maxHp: 48,
    attackMin: 12,
    attackMax: 16,
    xp: 206,
    dropTable: [
      { itemId: "potion", chance: 0.18 },
      { itemId: "manaPotion", chance: 0.18 }
    ],
    appearText: "崩界獣が破滅の咆哮とともに地平を割って迫る！",
    defeatText: "崩界獣は砕けた世界片のような文字群を散らし、奈落へ沈んだ。"
  },
  abyssWorm: {
    id: "abyssWorm",
    name: "アビスワーム",
    maxHp: 46,
    attackMin: 12,
    attackMax: 17,
    xp: 212,
    skillIds: ["devour"],
    dropTable: [
      { itemId: "potion", chance: 0.14 },
      { itemId: "manaPotion", chance: 0.2 }
    ],
    appearText: "アビスワームが闇の裂け目から口を開き、奈落ごと這い出してきた！",
    defeatText: "アビスワームは深淵の句点を残し、黒い余白へ沈んだ。"
  },
  nemesis: {
    id: "nemesis",
    name: "終焉竜ネメシス",
    maxHp: 84,
    attackMin: 13,
    attackMax: 18,
    xp: 620,
    isBoss: true,
    attackHitsMin: 1,
    attackHitsMax: 2,
    skillIds: ["crush", "devour"],
    dropTable: [
      { itemId: "potion", chance: 0.82 },
      { itemId: "manaPotion", chance: 0.78 }
    ],
    appearText: "99階の主、終焉竜ネメシスが世界の終わりそのものを背負って降り立った！",
    defeatText: "終焉竜ネメシスは崩壊の章を吐き尽くし、闇の彼方へ崩れ落ちた。"
  },
  mojiru: {
    id: "mojiru",
    name: "創造神モジール",
    maxHp: 120,
    attackMin: 14,
    attackMax: 20,
    attackHitsMin: 1,
    attackHitsMax: 2,
    xp: 1200,
    isBoss: true,
    traits: { magicLike: true },
    skillIds: ["crush", "burnStrike"],
    dropTable: [],
    appearText: "100階の最奥。創造神モジールが世界の原文を背に、静かに目を開いた。",
    defeatText: "創造神モジールはすべての文字を解き放ち、白い輝きの中で静かに消え去った。"
  }
};

const itemData = {
  potion: {
    id: "potion",
    name: "ポーション",
    target: "self",
    description: "HPを5〜8回復する。",
    use(state) {
      const amount = randomInt(5, 8);
      const healed = recoverResource(state.player, "hp", "maxHp", amount);
      return healed > 0
        ? `ポーションが解凍され、HPが ${healed} 回復した。`
        : "HPはすでに最大で、ポーションの文字列は静かに揺れた。";
    }
  },
  manaPotion: {
    id: "manaPotion",
    name: "マナポーション",
    target: "self",
    description: "MPを4〜7回復する。",
    use(state) {
      const amount = randomInt(4, 7);
      const restored = recoverResource(state.player, "mp", "maxMp", amount);
      return restored > 0
        ? `マナポーションの青い記述がほどけ、MPが ${restored} 回復した。`
        : "MPは満ちている。青い文字列は掌の上で明滅するだけだった。";
    }
  }
};

function createRecoverySkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: config.costMP,
    type: "active",
    logType: "heal",
    target: config.target || "self",
    description: config.description,
    use(state) {
      const amount = randomInt(config.minAmount, config.maxAmount) + (state.player.healingPower || 0);
      const healed = recoverResource(state.player, "hp", "maxHp", amount);
      return healed > 0
        ? `${state.player.name}のHPが ${healed} 回復した。`
        : `${state.player.name}のHPはすでに満ちている。`;
    }
  };
}

function createAttackSkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: config.costMP,
    type: "active",
    logType: "damage",
    target: config.target || "enemy",
    description: config.description,
    use(state) {
      const enemy = state.currentEnemy;
      const hitCount = config.hitCount || 1;
      let totalDamage = 0;

      for (let index = 0; index < hitCount; index += 1) {
        const baseDamage = randomInt(config.minDamage, config.maxDamage) + getPlayerDamageBonus(state.player, config.kind || "physical", enemy);
        const result = dealDamageToEnemy(enemy, baseDamage, {
          ignoreDefense: Boolean(config.ignoreDefense),
          pierceRate: config.pierceRate || state.player.defensePenetration || 0,
          accuracyBonus: (state.player.accuracyBonus || 0) + getPlayerAccuracyPenalty(state.player),
          damageKind: config.kind || "physical",
          fromSkill: true
        });

        if (!result.hit) {
          return config.evadeText || `${enemy.name} は攻撃を見切って回避した。`;
        }

        triggerDamageVisuals(result.damage, {
          target: "enemy",
          threshold: Math.max(8, Math.floor(enemy.maxHp * 0.12)),
          strong: result.damage >= Math.max(10, Math.floor(enemy.maxHp * 0.2)),
          extreme: enemy.isBoss && result.damage >= Math.max(14, Math.floor(enemy.maxHp * 0.24))
        });
        totalDamage += result.damage;
      }

      const impactText = typeof config.hitText === "function"
        ? config.hitText(enemy.name, totalDamage, hitCount)
        : `${enemy.name}に ${totalDamage} ダメージを与えた。`;

      return impactText;
    }
  };
}

function createGuardSkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: config.costMP,
    type: "active",
    target: "self",
    description: config.description,
    use(state) {
      state.player.guardCharges = config.charges;
      state.player.guardReduction = config.reduction;
      if (config.magicOnly) {
        state.player.magicGuardCharges = config.charges;
        state.player.magicGuardReduction = config.reduction;
      }
      return config.logText;
    }
  };
}

function createPassiveBoostSkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: 0,
    type: "passive",
    target: "self",
    description: config.description,
    onLearn(state) {
      state.player[config.maxKey] += config.amount;
      state.player[config.currentKey] = state.player[config.maxKey];
      return config.logText;
    }
  };
}

function createPassiveFlagSkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: 0,
    type: "passive",
    target: "self",
    description: config.description,
    onLearn(state) {
      if (config.mode === "add") {
        state.player[config.key] = (state.player[config.key] || 0) + config.value;
      } else if (config.mode === "min") {
        state.player[config.key] = Math.min(state.player[config.key] || config.value, config.value);
      } else if (config.mode === "max") {
        state.player[config.key] = Math.max(state.player[config.key] || 0, config.value);
      } else {
        state.player[config.key] = config.value;
      }
      return config.logText;
    }
  };
}

function createPassiveMultiStatSkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: 0,
    type: "passive",
    target: "self",
    description: config.description,
    onLearn(state) {
      Object.entries(config.values).forEach(([key, value]) => {
        if (typeof value === "number") {
          state.player[key] = (state.player[key] || 0) + value;
        } else {
          state.player[key] = value;
        }
      });

      if (config.fullHeal) {
        state.player.hp = state.player.maxHp;
        state.player.mp = state.player.maxMp;
      }

      return config.logText;
    }
  };
}

function createUtilitySkill(config) {
  return {
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: config.costMP,
    type: "active",
    target: config.target || "self",
    description: config.description,
    use(state) {
      return config.use(state);
    }
  };
}

function createReviveSkill(config) {
  return createUtilitySkill({
    id: config.id,
    name: config.name,
    costSP: config.costSP,
    costMP: config.costMP,
    description: config.description,
    use(state) {
      state.player.reviveCharges = config.charges;
      state.player.reviveHealRatio = config.healRatio;
      return config.logText;
    }
  });
}

const skillData = {
  heal: createRecoverySkill({
    id: "heal",
    name: "ヒール",
    costSP: 5,
    costMP: 3,
    description: "HPを4〜7回復する。",
    minAmount: 4,
    maxAmount: 7
  }),
  fireball: createAttackSkill({
    id: "fireball",
    name: "ファイヤーボール",
    costSP: 5,
    costMP: 4,
    description: "敵に4〜7の魔法ダメージ。",
    kind: "magic",
    minDamage: 4,
    maxDamage: 7,
    hitText: (enemyName, damage) => `${enemyName}を灼く火球が走り、${damage} ダメージを与えた。`,
    evadeText: "火球は炸裂したが、敵はその端をかすめるように避けた。"
  }),
  slash: createAttackSkill({
    id: "slash",
    name: "スラッシュ",
    costSP: 5,
    costMP: 3,
    description: "敵に3〜6の強めの物理ダメージ。",
    minDamage: 3,
    maxDamage: 6,
    hitText: (enemyName, damage) => `鋭い一閃が ${enemyName} を裂き、${damage} ダメージを与えた。`,
    evadeText: "敵は斬撃の軌道を読み、闇へ滑るように逃れた。"
  }),
  guard: createGuardSkill({
    id: "guard",
    name: "ガード",
    costSP: 5,
    costMP: 2,
    description: "次の敵攻撃1回だけ被ダメージを軽減する。",
    charges: 1,
    reduction: 2,
    logText: "ハルトは身構えた。次の敵攻撃のダメージを軽減する。"
  }),
  hpBoost: createPassiveBoostSkill({
    id: "hpBoost",
    name: "HP増強",
    costSP: 5,
    description: "取得時にMaxHPを恒久的に5上げる。",
    maxKey: "maxHp",
    currentKey: "hp",
    amount: 5,
    logText: "MaxHPが5上昇し、HPが全回復した。"
  }),
  mpBoost: createPassiveBoostSkill({
    id: "mpBoost",
    name: "MP増強",
    costSP: 5,
    description: "取得時にMaxMPを恒久的に5上げる。",
    maxKey: "maxMp",
    currentKey: "mp",
    amount: 5,
    logText: "MaxMPが5上昇し、MPが全回復した。"
  }),
  highHeal: createRecoverySkill({
    id: "highHeal",
    name: "ハイヒール",
    costSP: 10,
    costMP: 6,
    description: "HPを8〜14回復する。",
    minAmount: 8,
    maxAmount: 14
  }),
  iceBolt: createAttackSkill({
    id: "iceBolt",
    name: "アイスボルト",
    costSP: 10,
    costMP: 6,
    description: "敵に7〜11の氷魔法ダメージ。",
    kind: "magic",
    minDamage: 7,
    maxDamage: 11,
    hitText: (enemyName, damage) => `氷の矢が ${enemyName} を貫き、${damage} ダメージを与えた。`
  }),
  powerSlash: createAttackSkill({
    id: "powerSlash",
    name: "パワースラッシュ",
    costSP: 10,
    costMP: 5,
    description: "敵に6〜10の物理ダメージ。",
    minDamage: 6,
    maxDamage: 10,
    hitText: (enemyName, damage) => `重い斬撃が ${enemyName} を叩き割り、${damage} ダメージを与えた。`
  }),
  shield: createGuardSkill({
    id: "shield",
    name: "シールド",
    costSP: 10,
    costMP: 4,
    description: "次の敵攻撃1回の被ダメージを大きく軽減する。",
    charges: 1,
    reduction: 4,
    logText: "半透明の盾文字が展開され、次の一撃を強く受け止める。"
  }),
  hpBoostMedium: createPassiveBoostSkill({
    id: "hpBoostMedium",
    name: "HP増強中",
    costSP: 10,
    description: "取得時にMaxHPを恒久的に10上げる。",
    maxKey: "maxHp",
    currentKey: "hp",
    amount: 10,
    logText: "MaxHPが10上昇し、HPが全回復した。"
  }),
  mpBoostMedium: createPassiveBoostSkill({
    id: "mpBoostMedium",
    name: "MP増強中",
    costSP: 10,
    description: "取得時にMaxMPを恒久的に10上げる。",
    maxKey: "maxMp",
    currentKey: "mp",
    amount: 10,
    logText: "MaxMPが10上昇し、MPが全回復した。"
  }),
  cureAll: createUtilitySkill({
    id: "cureAll",
    name: "キュアオール",
    costSP: 20,
    costMP: 8,
    description: "自分にかかっている状態異常を解除する土台スキル。",
    use(state) {
      if (!state.player.statusAilments.length) {
        return "浄化の光は広がったが、解除すべき状態異常はなかった。";
      }
      clearAilments(state.player);
      return "浄化の文字列が身体を巡り、状態異常が解除された。";
    }
  }),
  thunderBolt: createAttackSkill({
    id: "thunderBolt",
    name: "サンダーボルト",
    costSP: 20,
    costMP: 9,
    description: "敵に10〜15の雷魔法ダメージ。",
    kind: "magic",
    minDamage: 10,
    maxDamage: 15,
    hitText: (enemyName, damage) => `落雷の一文が ${enemyName} を撃ち抜き、${damage} ダメージを与えた。`
  }),
  doubleSlash: createAttackSkill({
    id: "doubleSlash",
    name: "ダブルスラッシュ",
    costSP: 20,
    costMP: 8,
    description: "2連撃で合計8〜14程度のダメージを与える。",
    minDamage: 4,
    maxDamage: 7,
    hitCount: 2,
    hitText: (enemyName, damage, hitCount) => `${hitCount}連の斬撃が ${enemyName} を刻み、合計 ${damage} ダメージを与えた。`
  }),
  magicGuard: createGuardSkill({
    id: "magicGuard",
    name: "マジックガード",
    costSP: 20,
    costMP: 7,
    description: "次の魔法系ダメージ1回を軽減する土台スキル。",
    charges: 1,
    reduction: 5,
    magicOnly: true,
    logText: "魔法障壁が展開され、次の魔法的な一撃を弱める。"
  }),
  hpBoostLarge: createPassiveBoostSkill({
    id: "hpBoostLarge",
    name: "HP増強大",
    costSP: 20,
    description: "取得時にMaxHPを恒久的に16上げる。",
    maxKey: "maxHp",
    currentKey: "hp",
    amount: 16,
    logText: "MaxHPが16上昇し、HPが全回復した。"
  }),
  mpBoostLarge: createPassiveBoostSkill({
    id: "mpBoostLarge",
    name: "MP強化大",
    costSP: 20,
    description: "取得時にMaxMPを恒久的に16上げる。",
    maxKey: "maxMp",
    currentKey: "mp",
    amount: 16,
    logText: "MaxMPが16上昇し、MPが全回復した。"
  }),
  areaHeal: createRecoverySkill({
    id: "areaHeal",
    name: "エリアヒール",
    costSP: 30,
    costMP: 10,
    description: "広域回復の土台。今回は自分のHPを12〜18回復する。",
    minAmount: 12,
    maxAmount: 18
  }),
  flameBurst: createAttackSkill({
    id: "flameBurst",
    name: "フレイムバースト",
    costSP: 30,
    costMP: 12,
    description: "敵に13〜18の高威力魔法ダメージ。",
    kind: "magic",
    minDamage: 13,
    maxDamage: 18,
    hitText: (enemyName, damage) => `爆ぜる炎塊が ${enemyName} を包み、${damage} ダメージを与えた。`
  }),
  spinningSlash: createAttackSkill({
    id: "spinningSlash",
    name: "回転斬り",
    costSP: 30,
    costMP: 10,
    description: "全体攻撃の土台。今回は目の前の敵に11〜16ダメージ。",
    minDamage: 11,
    maxDamage: 16,
    hitText: (enemyName, damage) => `円を描く斬撃が ${enemyName} を巻き込み、${damage} ダメージを与えた。`
  }),
  ironWall: createGuardSkill({
    id: "ironWall",
    name: "鉄壁",
    costSP: 30,
    costMP: 9,
    description: "次の敵攻撃2回の被ダメージを強く軽減する。",
    charges: 2,
    reduction: 5,
    logText: "鉄壁の装甲文がハルトを覆い、しばらく強固に守る。"
  }),
  armorBreak: createPassiveFlagSkill({
    id: "armorBreak",
    name: "防御貫通",
    costSP: 30,
    description: "敵防御を一部無視できるようになる。",
    key: "defensePenetration",
    value: 2,
    mode: "add",
    logText: "攻撃が敵防御を一部貫通するようになった。"
  }),
  statusResistance: createPassiveFlagSkill({
    id: "statusResistance",
    name: "状態異常耐性",
    costSP: 30,
    description: "今後の状態異常に対する耐性フラグを有効化する。",
    key: "statusResistance",
    value: true,
    logText: "ハルトに状態異常耐性のフラグが刻まれた。"
  }),
  resurrect: createReviveSkill({
    id: "resurrect",
    name: "リザレクト",
    costSP: 40,
    costMP: 12,
    description: "戦闘不能時に1回だけHP30%で復活する。",
    charges: 1,
    healRatio: 0.3,
    logText: "蘇生の術式が刻まれた。倒れても一度だけ立ち上がれる。"
  }),
  iceLance: createAttackSkill({
    id: "iceLance",
    name: "アイスランス",
    costSP: 40,
    costMP: 14,
    description: "敵に16〜22の氷魔法ダメージ。",
    kind: "magic",
    minDamage: 16,
    maxDamage: 22,
    hitText: (enemyName, damage) => `氷槍が ${enemyName} を貫き、${damage} ダメージを与えた。`
  }),
  vacuumSlash: createAttackSkill({
    id: "vacuumSlash",
    name: "真空斬り",
    costSP: 40,
    costMP: 12,
    description: "敵に14〜20の斬撃ダメージ。",
    minDamage: 14,
    maxDamage: 20,
    hitText: (enemyName, damage) => `真空の刃が ${enemyName} を裂き、${damage} ダメージを与えた。`
  }),
  counterStance: createUtilitySkill({
    id: "counterStance",
    name: "反撃の構え",
    costSP: 40,
    costMP: 10,
    description: "次の被弾後に反撃する構えを取る。",
    use(state) {
      state.player.counterCharges = 1;
      state.player.counterPower = 10;
      return "ハルトは反撃の構えを取った。次の被弾後に迎撃する。";
    }
  }),
  accuracyBoost: createPassiveFlagSkill({
    id: "accuracyBoost",
    name: "命中率増強",
    costSP: 40,
    description: "敵の回避を見切りやすくなる。",
    key: "accuracyBonus",
    value: 3,
    mode: "add",
    logText: "ハルトの攻撃精度が上昇した。"
  }),
  evasionBoost: createPassiveFlagSkill({
    id: "evasionBoost",
    name: "回避率増強",
    costSP: 40,
    description: "敵の攻撃をかわしやすくなる。",
    key: "evasionBonus",
    value: 2,
    mode: "add",
    logText: "ハルトの回避性能が上昇した。"
  }),
  greaterHeal: createRecoverySkill({
    id: "greaterHeal",
    name: "グレーターヒール",
    costSP: 50,
    costMP: 16,
    description: "HPを18〜26回復する。",
    minAmount: 18,
    maxAmount: 26
  }),
  lightningStorm: createAttackSkill({
    id: "lightningStorm",
    name: "ライトニングストーム",
    costSP: 50,
    costMP: 18,
    description: "敵に20〜28の雷ダメージ。",
    kind: "magic",
    minDamage: 20,
    maxDamage: 28,
    hitText: (enemyName, damage) => `雷嵐が ${enemyName} を撃ち据え、${damage} ダメージを与えた。`
  }),
  galeSlash: createAttackSkill({
    id: "galeSlash",
    name: "烈風斬",
    costSP: 50,
    costMP: 14,
    description: "敵に18〜24の斬撃ダメージ。",
    minDamage: 18,
    maxDamage: 24,
    hitText: (enemyName, damage) => `烈風の斬撃が ${enemyName} を薙ぎ、${damage} ダメージを与えた。`
  }),
  holyProtection: createGuardSkill({
    id: "holyProtection",
    name: "聖なる加護",
    costSP: 50,
    costMP: 14,
    description: "次の被ダメージ2回を軽減する。",
    charges: 2,
    reduction: 6,
    logText: "聖なる加護がハルトを包み、しばらく被ダメージを抑える。"
  }),
  maxHpGreatBoost: createPassiveBoostSkill({
    id: "maxHpGreatBoost",
    name: "最大HP大増強",
    costSP: 50,
    description: "取得時にMaxHPを恒久的に24上げる。",
    maxKey: "maxHp",
    currentKey: "hp",
    amount: 24,
    logText: "MaxHPが24上昇し、HPが全回復した。"
  }),
  maxMpGreatBoost: createPassiveBoostSkill({
    id: "maxMpGreatBoost",
    name: "最大MP大増強",
    costSP: 50,
    description: "取得時にMaxMPを恒久的に24上げる。",
    maxKey: "maxMp",
    currentKey: "mp",
    amount: 24,
    logText: "MaxMPが24上昇し、MPが全回復した。"
  }),
  fullCure: createUtilitySkill({
    id: "fullCure",
    name: "完全治癒",
    costSP: 60,
    costMP: 18,
    description: "HPを大きく回復し、状態異常も解除する。",
    use(state) {
      const healed = recoverResource(state.player, "hp", "maxHp", state.player.maxHp);
      clearAilments(state.player);
      return healed > 0
        ? `完全治癒が発動し、HPが ${healed} 回復して状態異常も解除された。`
        : "完全治癒が発動し、状態異常だけが浄化された。";
    }
  }),
  meteorFire: createAttackSkill({
    id: "meteorFire",
    name: "メテオファイア",
    costSP: 60,
    costMP: 22,
    description: "敵に24〜32の火属性ダメージ。",
    kind: "magic",
    minDamage: 24,
    maxDamage: 32,
    hitText: (enemyName, damage) => `灼熱の隕火が ${enemyName} を撃ち、${damage} ダメージを与えた。`
  }),
  crossSlash: createAttackSkill({
    id: "crossSlash",
    name: "十字斬り",
    costSP: 60,
    costMP: 16,
    description: "2連の交差斬撃で大ダメージを与える。",
    minDamage: 10,
    maxDamage: 15,
    hitCount: 2,
    hitText: (enemyName, damage, hitCount) => `${hitCount}本の斬線が ${enemyName} を刻み、合計 ${damage} ダメージを与えた。`
  }),
  absoluteDefense: createGuardSkill({
    id: "absoluteDefense",
    name: "絶対防御",
    costSP: 60,
    costMP: 18,
    description: "次の被ダメージ2回を大きく軽減する。",
    charges: 2,
    reduction: 9,
    logText: "絶対防御の障壁が展開された。"
  }),
  mpEfficiency: createPassiveFlagSkill({
    id: "mpEfficiency",
    name: "消費MP軽減",
    costSP: 60,
    description: "スキル消費MPが少し減る。",
    key: "mpCostRate",
    value: 0.85,
    mode: "min",
    logText: "ハルトは魔力運用を最適化し、消費MPが軽くなった。"
  }),
  hpRegenBoost: createPassiveFlagSkill({
    id: "hpRegenBoost",
    name: "HP自動回復",
    costSP: 60,
    description: "ターン終了時に少しHPが回復する。",
    key: "hpRegen",
    value: 4,
    mode: "add",
    logText: "ハルトに自動回復の力が宿った。"
  }),
  lightOfRevival: createReviveSkill({
    id: "lightOfRevival",
    name: "蘇生の光",
    costSP: 70,
    costMP: 20,
    description: "戦闘不能時に1回だけHP60%で復活する。",
    charges: 1,
    healRatio: 0.6,
    logText: "蘇生の光が身体に満ちた。深手でも立ち上がれる。"
  }),
  blizzardStorm: createAttackSkill({
    id: "blizzardStorm",
    name: "ブリザードストーム",
    costSP: 70,
    costMP: 24,
    description: "敵に28〜36の氷嵐ダメージ。",
    kind: "magic",
    minDamage: 28,
    maxDamage: 36,
    hitText: (enemyName, damage) => `吹き荒れる氷嵐が ${enemyName} を呑み込み、${damage} ダメージを与えた。`
  }),
  shadowSlash: createAttackSkill({
    id: "shadowSlash",
    name: "影斬り",
    costSP: 70,
    costMP: 18,
    description: "敵に24〜31の斬撃ダメージ。",
    minDamage: 24,
    maxDamage: 31,
    hitText: (enemyName, damage) => `影の刃が ${enemyName} を切り裂き、${damage} ダメージを与えた。`
  }),
  guardianBarrier: createGuardSkill({
    id: "guardianBarrier",
    name: "守護結界",
    costSP: 70,
    costMP: 18,
    description: "次の被ダメージ3回を軽減する。",
    charges: 3,
    reduction: 7,
    logText: "守護結界が展開され、連続攻撃にも耐えやすくなった。"
  }),
  comboBoost: createPassiveFlagSkill({
    id: "comboBoost",
    name: "連撃強化",
    costSP: 70,
    description: "物理スキルの連撃火力が上がる。",
    key: "physicalPower",
    value: 4,
    logText: "ハルトの連撃性能が強化された。"
  }),
  lifeSteal: createPassiveFlagSkill({
    id: "lifeSteal",
    name: "吸収攻撃",
    costSP: 70,
    description: "攻撃時に与ダメージの一部を吸収する。",
    key: "lifeStealRate",
    value: 0.15,
    logText: "与えたダメージの一部を吸収できるようになった。"
  }),
  angelHeal: createRecoverySkill({
    id: "angelHeal",
    name: "エンジェルヒール",
    costSP: 80,
    costMP: 22,
    description: "HPを30〜40回復する。",
    minAmount: 30,
    maxAmount: 40
  }),
  inferno: createAttackSkill({
    id: "inferno",
    name: "インフェルノ",
    costSP: 80,
    costMP: 28,
    description: "敵に34〜44の業火ダメージ。",
    kind: "magic",
    minDamage: 34,
    maxDamage: 44,
    hitText: (enemyName, damage) => `業火の奔流が ${enemyName} を焼き尽くし、${damage} ダメージを与えた。`
  }),
  skyBreakSlash: createAttackSkill({
    id: "skyBreakSlash",
    name: "滅空斬",
    costSP: 80,
    costMP: 20,
    description: "敵に30〜38の強烈な斬撃ダメージ。",
    minDamage: 30,
    maxDamage: 38,
    hitText: (enemyName, damage) => `天を裂く斬撃が ${enemyName} を断ち、${damage} ダメージを与えた。`
  }),
  kingsShield: createGuardSkill({
    id: "kingsShield",
    name: "王者の盾",
    costSP: 80,
    costMP: 20,
    description: "次の被ダメージ3回を大きく軽減する。",
    charges: 3,
    reduction: 10,
    logText: "王者の盾が展開され、揺るぎない防壁となった。"
  }),
  allStatsBoost: createPassiveMultiStatSkill({
    id: "allStatsBoost",
    name: "全能力強化",
    costSP: 80,
    description: "攻撃・回復・防御の基礎能力を底上げする。",
    values: {
      physicalPower: 3,
      magicPower: 3,
      healingPower: 3,
      damageReduction: 1,
      accuracyBonus: 1,
      evasionBonus: 1
    },
    logText: "ハルトの全能力が底上げされた。"
  }),
  weaknessExploit: createPassiveFlagSkill({
    id: "weaknessExploit",
    name: "弱点特効",
    costSP: 80,
    description: "状態異常中やボスへの与ダメージが上がる。",
    key: "weaknessExploit",
    value: 3,
    logText: "ハルトは敵の弱点を突く術を会得した。"
  }),
  saintRecover: createRecoverySkill({
    id: "saintRecover",
    name: "セイントリカバー",
    costSP: 90,
    costMP: 24,
    description: "HPを36〜48回復する。",
    minAmount: 36,
    maxAmount: 48
  }),
  endFlame: createAttackSkill({
    id: "endFlame",
    name: "終焉の業火",
    costSP: 90,
    costMP: 30,
    description: "敵に40〜52の終末火炎ダメージ。",
    kind: "magic",
    minDamage: 40,
    maxDamage: 52,
    hitText: (enemyName, damage) => `終焉の業火が ${enemyName} を焼き払い、${damage} ダメージを与えた。`
  }),
  dimensionSlash: createAttackSkill({
    id: "dimensionSlash",
    name: "次元斬",
    costSP: 90,
    costMP: 24,
    description: "敵防御を大きく無視して斬る。",
    minDamage: 34,
    maxDamage: 42,
    pierceRate: 99,
    hitText: (enemyName, damage) => `次元を断つ斬撃が ${enemyName} を貫き、${damage} ダメージを与えた。`
  }),
  divineBarrier: createGuardSkill({
    id: "divineBarrier",
    name: "神聖障壁",
    costSP: 90,
    costMP: 24,
    description: "次の被ダメージ4回を軽減する。",
    charges: 4,
    reduction: 9,
    logText: "神聖障壁が展開され、強烈な攻撃にも耐えられる。"
  }),
  autoRecovery: createPassiveFlagSkill({
    id: "autoRecovery",
    name: "自動回復",
    costSP: 90,
    description: "ターン終了時の自動回復量が増える。",
    key: "hpRegen",
    value: 8,
    mode: "add",
    logText: "自動回復能力がさらに高まった。"
  }),
  deathResist: createPassiveFlagSkill({
    id: "deathResist",
    name: "即死耐性",
    costSP: 90,
    description: "一撃で倒れにくくなる土台フラグ。",
    key: "deathResist",
    value: true,
    logText: "ハルトに即死耐性が刻まれた。"
  }),
  fullRestore: createUtilitySkill({
    id: "fullRestore",
    name: "全回復",
    costSP: 100,
    costMP: 28,
    description: "HPとMPを全回復し、状態異常も解除する。",
    use(state) {
      state.player.hp = state.player.maxHp;
      state.player.mp = state.player.maxMp;
      clearAilments(state.player);
      return "全回復が発動し、HPとMPが満ちて状態異常も解除された。";
    }
  }),
  ultimateFlare: createAttackSkill({
    id: "ultimateFlare",
    name: "アルティメットフレア",
    costSP: 100,
    costMP: 36,
    description: "敵に50〜64の極大魔法ダメージ。",
    kind: "magic",
    minDamage: 50,
    maxDamage: 64,
    hitText: (enemyName, damage) => `極限の閃火が ${enemyName} を呑み込み、${damage} ダメージを与えた。`
  }),
  godSlayerSlash: createAttackSkill({
    id: "godSlayerSlash",
    name: "神滅斬",
    costSP: 100,
    costMP: 28,
    description: "敵に44〜56の神域級斬撃ダメージ。",
    minDamage: 44,
    maxDamage: 56,
    pierceRate: 99,
    hitText: (enemyName, damage) => `神をも断つ一閃が ${enemyName} を貫き、${damage} ダメージを与えた。`
  }),
  invincible: createUtilitySkill({
    id: "invincible",
    name: "インビンシブル",
    costSP: 100,
    costMP: 30,
    description: "次の被ダメージ2回を完全に防ぐ。",
    use(state) {
      state.player.guardCharges = 2;
      state.player.guardReduction = 999;
      state.player.magicGuardCharges = 2;
      state.player.magicGuardReduction = 999;
      return "インビンシブルが発動。しばらく無敵の障壁に包まれる。";
    }
  }),
  transcendentBody: createPassiveMultiStatSkill({
    id: "transcendentBody",
    name: "超越者の肉体",
    costSP: 100,
    description: "肉体と防御を大幅に強化する。",
    values: {
      maxHp: 40,
      physicalPower: 5,
      damageReduction: 2,
      evasionBonus: 1
    },
    fullHeal: true,
    logText: "超越者の肉体が完成し、耐久と攻撃が大きく伸びた。"
  }),
  manaAwakening: createPassiveMultiStatSkill({
    id: "manaAwakening",
    name: "魔力覚醒",
    costSP: 100,
    description: "魔法火力と回復力、MP効率を大きく高める。",
    values: {
      maxMp: 36,
      magicPower: 6,
      healingPower: 6,
      mpCostRate: -0.15
    },
    fullHeal: true,
    logText: "魔力覚醒により、ハルトの魔法適性が一段上へ到達した。"
  })
};

const ailmentData = {
  poison: {
    id: "poison",
    name: "毒",
    duration: 3
  },
  paralysis: {
    id: "paralysis",
    name: "麻痺",
    duration: 2
  },
  burn: {
    id: "burn",
    name: "火傷",
    duration: 3
  },
  bind: {
    id: "bind",
    name: "拘束",
    duration: 2
  },
  freeze: {
    id: "freeze",
    name: "凍結",
    duration: 1
  },
  blind: {
    id: "blind",
    name: "幻惑",
    duration: 2
  },
  skillSeal: {
    id: "skillSeal",
    name: "改変封印",
    duration: 1
  }
};

function getBossGimmick(enemy) {
  if (!enemy || !enemy.isBoss) {
    return null;
  }
  return bossGimmickData[enemy.id] || null;
}

function createBossState(enemy) {
  return {
    turn: 0,
    phase: 1,
    flags: {},
    patternIndex: 0
  };
}

function getBossState(enemy) {
  if (!enemy || !enemy.isBoss) {
    return null;
  }
  if (!enemy.bossState) {
    enemy.bossState = createBossState(enemy);
  }
  return enemy.bossState;
}

function runBossBattleStart(enemy, player) {
  const gimmick = getBossGimmick(enemy);
  if (!gimmick || typeof gimmick.onBattleStart !== "function") {
    return;
  }
  gimmick.onBattleStart({
    enemy,
    player,
    state: getBossState(enemy)
  });
}

function runBossTurnStart(enemy, player) {
  const gimmick = getBossGimmick(enemy);
  const state = getBossState(enemy);
  if (!gimmick || !state) {
    return { consumed: false };
  }

  state.turn += 1;
  if (typeof gimmick.onTurnStart !== "function") {
    return { consumed: false };
  }

  return gimmick.onTurnStart({
    enemy,
    player,
    state
  }) || { consumed: false };
}

function runBossAfterEnemyAction(enemy, player) {
  const gimmick = getBossGimmick(enemy);
  if (!gimmick || typeof gimmick.onAfterEnemyAction !== "function") {
    return;
  }

  gimmick.onAfterEnemyAction({
    enemy,
    player,
    state: getBossState(enemy)
  });
}

function applyBossIncomingDamageGimmick(enemy, damage, options = {}) {
  const gimmick = getBossGimmick(enemy);
  if (!gimmick || typeof gimmick.onBeforeTakeDamage !== "function") {
    return { blocked: false, damage };
  }

  return gimmick.onBeforeTakeDamage({
    enemy,
    state: getBossState(enemy),
    damage,
    options
  }) || { blocked: false, damage };
}

function getBossSpecialStateLabels(enemy) {
  const labels = [];
  const gimmick = getBossGimmick(enemy);
  const state = getBossState(enemy);
  if (!gimmick || !state) {
    return labels;
  }

  if (state.phase >= 2) {
    labels.push(`フェーズ${state.phase}`);
  }
  if (state.flags.enraged) {
    labels.push("怒り");
  }
  if (state.flags.hardenedTurns > 0) {
    labels.push("硬質化");
  }
  if (state.flags.submerged) {
    labels.push("潜行");
  }
  if (state.flags.barrierTurns > 0) {
    labels.push("神聖障壁");
  }
  if (state.flags.mirageTurns > 0) {
    labels.push("幻惑結界");
  }
  if (state.flags.rewriteTurns > 0) {
    labels.push("改変干渉");
  }

  return labels;
}

const enemySkillData = {
  poisonSting: {
    id: "poisonSting",
    name: "毒針",
    chance: 0.38,
    use(state, enemy, player) {
      const damage = applyDamageToPlayer(player, enemy, randomInt(3, 5), {
        isMagicLike: false,
        logType: "system",
        attackText: `${enemy.name}の毒針。ハルトは ${damage} ダメージを受けた。`
      });
      tryApplyAilment(player, "poison", enemy.name, 0.7);
      return damage;
    }
  },
  paralysisPulse: {
    id: "paralysisPulse",
    name: "麻痺電流",
    chance: 0.34,
    use(state, enemy, player) {
      const damage = applyDamageToPlayer(player, enemy, randomInt(3, 6), {
        isMagicLike: true,
        logType: "system",
        attackText: `${enemy.name}の麻痺電流。ハルトは ${damage} ダメージを受けた。`
      });
      tryApplyAilment(player, "paralysis", enemy.name, 0.65);
      return damage;
    }
  },
  defenseUp: {
    id: "defenseUp",
    name: "防御上昇",
    chance: 0.28,
    use(state, enemy) {
      enemy.defense = Math.min(enemy.baseDefense + 3, enemy.defense + 1);
      addLog(`${enemy.name}は岩の装甲を重ね、防御が上がった。`, "system");
      return 0;
    }
  },
  crush: {
    id: "crush",
    name: "強打",
    chance: 0.32,
    use(state, enemy, player) {
      return applyDamageToPlayer(player, enemy, randomInt(7, 11), {
        isMagicLike: false,
        logType: "system",
        attackText: (damage) => `${enemy.name}の強打。ハルトは ${damage} ダメージを受けた。`
      });
    }
  },
  devour: {
    id: "devour",
    name: "捕食",
    chance: 0.3,
    use(state, enemy, player) {
      return applyDamageToPlayer(player, enemy, randomInt(8, 12), {
        isMagicLike: false,
        logType: "boss",
        attackText: (damage) => `${enemy.name}の捕食攻撃。ハルトは ${damage} ダメージを受けた。`
      });
    }
  },
  burnStrike: {
    id: "burnStrike",
    name: "火傷攻撃",
    chance: 0.3,
    use(state, enemy, player) {
      const damage = applyDamageToPlayer(player, enemy, randomInt(4, 6), {
        isMagicLike: true,
        logType: "system",
        attackText: (value) => `${enemy.name}の灼熱攻撃。ハルトは ${value} ダメージを受けた。`
      });
      tryApplyAilment(player, "burn", enemy.name, 0.6);
      return damage;
    }
  }
};

const bossGimmickData = {
  orc: {
    gimmickType: "rage",
    phase: 2,
    pattern: ["normal", "enrage"],
    onTurnStart({ enemy, state }) {
      if (!state.flags.enraged && enemy.hp <= Math.floor(enemy.maxHp * 0.5)) {
        state.phase = 2;
        state.flags.enraged = true;
        enemy.attackMin += 2;
        enemy.attackMax += 3;
        addLog("オークは怒り狂っている！", "phase");
        addLog("オークの猛攻が激しさを増した！", "boss");
        queueUiEffect("fx-shake", 220);
      }
      return { consumed: false };
    }
  },
  golem: {
    gimmickType: "fortress",
    phase: 2,
    pattern: ["normal", "harden"],
    onTurnStart({ enemy, state }) {
      if ((state.flags.hardenedTurns || 0) > 0) {
        state.flags.hardenedTurns -= 1;
        if (state.flags.hardenedTurns <= 0) {
          enemy.defense = enemy.baseDefense;
          addLog("ゴーレムの硬質化が解け、装甲がやや軟化した。", "system");
        }
      }
      if (state.turn % 3 === 0) {
        state.flags.hardenedTurns = 2;
        enemy.defense = enemy.baseDefense + 4;
        addLog("ゴーレムの体表が硬質化した！", "phase");
        addLog("通常攻撃では削りにくい……！", "boss");
        queueUiEffect("fx-flash", 260);
      }
      return { consumed: false };
    },
    onBeforeTakeDamage({ state, damage, options }) {
      if ((state.flags.hardenedTurns || 0) > 0 && (options.damageKind || "physical") === "physical") {
        return { blocked: false, damage: Math.max(1, Math.floor(damage * 0.45)) };
      }
      return { blocked: false, damage };
    }
  },
  sandWorm: {
    gimmickType: "submerge",
    phase: 2,
    pattern: ["潜行", "奇襲"],
    onTurnStart({ enemy, player, state }) {
      if (state.flags.chargedRush) {
        state.flags.chargedRush = false;
        state.flags.submerged = false;
        addLog("地面が裂け、サンドワームが奇襲を仕掛けた！", "boss");
        executeEnemyAttack(enemy, player, {
          min: enemy.attackMin + 4,
          max: enemy.attackMax + 6,
          isMagicLike: false,
          logType: "boss",
          textSingle: "サンドワームの奇襲。ハルトは {damage} ダメージを受けた。"
        });
        return { consumed: true };
      }
      if (state.turn % 3 === 0) {
        state.flags.submerged = true;
        state.flags.chargedRush = true;
        addLog("サンドワームは砂の中に潜った！", "boss");
        addLog("地面が大きくうねっている……！", "boss");
        queueUiEffect("fx-shake", 220);
        return { consumed: true };
      }
      return { consumed: false };
    },
    onBeforeTakeDamage({ state, damage, options }) {
      if (state.flags.submerged && (options.damageKind || "physical") === "physical" && Math.random() < 0.7) {
        addLog("潜行中のサンドワームには攻撃が届かない！", "system");
        return { blocked: true, damage: 0 };
      }
      return { blocked: false, damage };
    }
  },
  kraken: {
    gimmickType: "bind",
    phase: 2,
    pattern: ["連撃", "拘束"],
    onTurnStart({ enemy, player, state }) {
      if (state.turn % 3 === 0) {
        const damage = executeEnemyAttack(enemy, player, {
          min: enemy.attackMin + 2,
          max: enemy.attackMax + 3,
          isMagicLike: false,
          logType: "boss",
          textSingle: "触手の締め付け。ハルトは {damage} ダメージを受けた。"
        });
        if (damage > 0) {
          tryApplyAilment(player, "bind", "クラーケン", 0.75);
          addLog("触手がハルトの動きを封じた！", "boss");
          queueUiEffect("fx-shake", 240);
        }
        return { consumed: true };
      }
      return { consumed: false };
    }
  },
  ifrit: {
    gimmickType: "inferno",
    phase: 2,
    pattern: ["灼熱攻撃", "全体火炎"],
    onTurnStart({ enemy, player, state }) {
      if (state.turn % 4 === 0) {
        addLog("灼熱の炎が吹き荒れる！", "boss");
        queueUiEffect("fx-flash", 280);
        const damage = executeEnemyAttack(enemy, player, {
          min: enemy.attackMin + 3,
          max: enemy.attackMax + 5,
          isMagicLike: true,
          logType: "boss",
          textSingle: "イフリートの炎嵐。ハルトは {damage} ダメージを受けた。"
        });
        if (damage > 0) {
          tryApplyAilment(player, "burn", "イフリート", 0.85);
        }
        return { consumed: true };
      }
      return { consumed: false };
    }
  },
  iceDragon: {
    gimmickType: "frost-breath",
    phase: 2,
    pattern: ["氷爪", "氷ブレス"],
    onTurnStart({ enemy, player, state }) {
      if (state.turn % 4 === 0) {
        addLog("氷気が空間そのものを凍らせる！", "boss");
        queueUiEffect("fx-flash", 220);
        const damage = executeEnemyAttack(enemy, player, {
          min: enemy.attackMin + 3,
          max: enemy.attackMax + 5,
          isMagicLike: true,
          logType: "boss",
          textSingle: "アイスドラゴンの氷ブレス。ハルトは {damage} ダメージを受けた。"
        });
        if (damage > 0) {
          tryApplyAilment(player, "freeze", "アイスドラゴン", 0.65);
        }
        return { consumed: true };
      }
      return { consumed: false };
    }
  },
  fairyQueen: {
    gimmickType: "illusion",
    phase: 2,
    pattern: ["妖精魔法", "幻惑"],
    onTurnStart({ player, state }) {
      if ((state.flags.mirageTurns || 0) > 0) {
        state.flags.mirageTurns -= 1;
      }
      if (state.turn % 3 === 0) {
        state.flags.mirageTurns = 2;
        addLog("幻想の光が視界を歪める！", "boss");
        queueUiEffect("fx-log-flicker", 300);
        tryApplyAilment(player, "blind", "フェアリークイーン", 1);
      }
      return { consumed: false };
    },
    onBeforeTakeDamage({ state, damage }) {
      if ((state.flags.mirageTurns || 0) > 0 && Math.random() < 0.2) {
        addLog("攻撃の軌道がぶれた！ 幻惑結界に阻まれた。", "system");
        return { blocked: true, damage: 0 };
      }
      return { blocked: false, damage };
    }
  },
  griffon: {
    gimmickType: "high-speed",
    phase: 2,
    pattern: ["急降下", "追撃"],
    onAfterEnemyAction({ enemy, player }) {
      if (Math.random() < 0.35 && player.hp > 0 && enemy.hp > 0) {
        addLog("グリフォンが空を裂くように急降下した！", "boss");
        addLog("あまりにも速い！", "boss");
        queueUiEffect("fx-shake", 180);
        executeEnemyAttack(enemy, player, {
          min: enemy.attackMin + 1,
          max: enemy.attackMax + 2,
          isMagicLike: false,
          logType: "boss",
          textSingle: "グリフォンの追撃。ハルトは {damage} ダメージを受けた。"
        });
      }
    }
  },
  dominion: {
    gimmickType: "holy-barrier",
    phase: 2,
    pattern: ["裁き", "障壁"],
    onTurnStart({ state }) {
      if ((state.flags.barrierTurns || 0) > 0) {
        state.flags.barrierTurns -= 1;
      }
      if (state.turn % 3 === 0) {
        state.flags.barrierTurns = 2;
        addLog("ドミニオンは神聖障壁を展開した！", "phase");
        addLog("光の壁が攻撃を阻む！", "boss");
        queueUiEffect("fx-flash", 260);
      }
      return { consumed: false };
    },
    onBeforeTakeDamage({ state, damage }) {
      if ((state.flags.barrierTurns || 0) > 0) {
        return { blocked: false, damage: Math.max(1, Math.floor(damage * 0.35)) };
      }
      return { blocked: false, damage };
    }
  },
  nemesis: {
    gimmickType: "apocalypse-phase",
    phase: 2,
    pattern: ["終焉咆哮", "崩界攻撃"],
    onTurnStart({ enemy, player, state }) {
      if (!state.flags.enraged && enemy.hp <= Math.floor(enemy.maxHp * 0.4)) {
        state.flags.enraged = true;
        state.phase = 2;
        enemy.attackMin += 3;
        enemy.attackMax += 5;
        addLog("終焉竜ネメシスが咆哮する！", "phase");
        addLog("世界そのものが軋み始めた……！", "boss");
        addCorruptedLog("文法エンジンの整合性が失われています", { strength: 0.28 });
        queueUiEffect("fx-shake", 280);
      }
      if (state.flags.enraged && state.turn % 3 === 0) {
        addLog("終焉の奔流が解き放たれた！", "boss");
        const damage = executeEnemyAttack(enemy, player, {
          min: enemy.attackMin + 4,
          max: enemy.attackMax + 6,
          hitsMin: 2,
          hitsMax: 3,
          isMagicLike: true,
          logType: "boss",
          textMulti: "崩界の連鎖。ハルトは合計 {damage} ダメージを受けた。"
        });
        if (damage > 0) {
          tryApplyAilment(player, "burn", "終焉竜ネメシス", 0.55);
          tryApplyAilment(player, "paralysis", "終焉竜ネメシス", 0.45);
        }
        return { consumed: true };
      }
      return { consumed: false };
    }
  },
  mojiru: {
    gimmickType: "rewrite",
    phase: 3,
    pattern: ["改変", "消去", "再記述"],
    onTurnStart({ enemy, player, state }) {
      if (state.turn % 3 === 0) {
        state.flags.rewriteTurns = 1;
        player.guardCharges = 0;
        player.magicGuardCharges = 0;
        player.counterCharges = 0;
        addLog("モジールが世界の記述を書き換えた。", "phase");
        addCorruptedLog("スキル情報が乱れている……！", { strength: 0.35 });
        addRewrittenLog("『ヒール』の定義が安定している。", "『ヒール』の定義が一瞬、揺らいだ。", 900, "system");
        applyTemporaryButtonLabels(mojiruLabelMap, 2200);
        queueUiEffect("fx-log-flicker", 360);
        tryApplyAilment(player, "skillSeal", "創造神モジール", 1);
        return { consumed: false };
      }
      if ((state.flags.rewriteTurns || 0) > 0) {
        state.flags.rewriteTurns -= 1;
      }
      return { consumed: false };
    },
    onBeforeTakeDamage({ damage, options }) {
      if (options.fromSkill && Math.random() < 0.2) {
        addLog("モジールが術式を改変し、スキルの効果が歪められた。", "boss");
        addCorruptedLog("---- PATCH CONFLICT : SKILL NODE ----", { strength: 0.32 });
        return { blocked: false, damage: Math.max(1, Math.floor(damage * 0.4)) };
      }
      return { blocked: false, damage };
    }
  }
};

function getAilmentName(ailmentId) {
  return ailmentData[ailmentId]?.name || ailmentId;
}

function getStatusEffectLabels(target) {
  if (!Array.isArray(target.statusAilments) || target.statusAilments.length === 0) {
    return ["なし"];
  }

  return target.statusAilments.map((ailment) => getAilmentName(ailment.id));
}

function hasAilment(target, ailmentId) {
  return target.statusAilments.some((ailment) => ailment.id === ailmentId);
}

function clearAilments(target) {
  target.statusAilments = [];
}

function sanitizeStatusAilments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string" && ailmentData[entry]) {
        return {
          id: entry,
          duration: ailmentData[entry].duration
        };
      }

      if (!isPlainObject(entry) || typeof entry.id !== "string" || !ailmentData[entry.id]) {
        return null;
      }

      return {
        id: entry.id,
        duration: Math.max(1, Math.floor(Number(entry.duration) || ailmentData[entry.id].duration))
      };
    })
    .filter(Boolean);
}

function tryApplyAilment(target, ailmentId, sourceName, chance = 1) {
  const ailment = ailmentData[ailmentId];
  if (!ailment) {
    return false;
  }

  if (target.statusResistance && Math.random() < 0.5) {
    addLog(`${sourceName}の${ailment.name}は耐性に阻まれた。`, "system");
    return false;
  }

  const difficulty = getCurrentDifficultyConfig();
  const adjustedChance = Math.min(1, Math.max(0, chance * (difficulty.ailmentChanceMultiplier || 1)));
  if (Math.random() > adjustedChance) {
    return false;
  }

  const existing = target.statusAilments.find((effect) => effect.id === ailmentId);
  if (existing) {
    existing.duration = Math.max(existing.duration, ailment.duration);
  } else {
    target.statusAilments.push({ id: ailmentId, duration: ailment.duration });
  }

  addLog(`${sourceName}により ${ailment.name} が付与された。`, "status");
  return true;
}

function processTurnStartAilments(target, label) {
  if (hasAilment(target, "freeze")) {
    addLog(`${label}は凍結して動けない。`, "status");
    return false;
  }
  if (hasAilment(target, "bind") && Math.random() < 0.45) {
    addLog(`${label}は拘束され、身動きが取れない。`, "status");
    return false;
  }
  if (hasAilment(target, "paralysis") && Math.random() < 0.35) {
    addLog(`${label}は麻痺で身体がしびれ、行動できない。`, "status");
    return false;
  }
  return true;
}

function processTurnEndAilments(target, label) {
  if (!Array.isArray(target.statusAilments) || target.statusAilments.length === 0) {
    if (label === "ハルト" && target.hpRegen > 0 && target.hp > 0) {
      const recovered = recoverResource(target, "hp", "maxHp", target.hpRegen);
      if (recovered > 0) {
        addLog(`自動回復が働き、HPが ${recovered} 回復した。`, "system");
      }
    }
    return;
  }

  const remained = [];
  target.statusAilments.forEach((ailment) => {
    if (ailment.id === "poison") {
      const damage = Math.max(1, Math.floor(target.maxHp * 0.08));
      target.hp = Math.max(0, target.hp - damage);
      addLog(`${label}は毒に侵され、${damage} ダメージを受けた。`, "danger");
    }

    if (ailment.id === "burn") {
      const damage = Math.max(1, Math.floor(target.maxHp * 0.06));
      target.hp = Math.max(0, target.hp - damage);
      addLog(`${label}は火傷で焼かれ、${damage} ダメージを受けた。`, "danger");
    }

    ailment.duration -= 1;
    if (ailment.duration > 0) {
      remained.push(ailment);
    } else {
      addLog(`${label}の${getAilmentName(ailment.id)}が解除された。`, "system");
    }
  });
  target.statusAilments = remained;

  if (label === "ハルト" && target.hpRegen > 0 && target.hp > 0) {
    const recovered = recoverResource(target, "hp", "maxHp", target.hpRegen);
    if (recovered > 0) {
      addLog(`自動回復が働き、HPが ${recovered} 回復した。`, "system");
    }
  }
}

function getAttackPowerOffset(target) {
  return hasAilment(target, "burn") ? -1 : 0;
}

function getPlayerAccuracyPenalty(player) {
  return hasAilment(player, "blind") ? -2 : 0;
}

function getSkillMpCost(skill) {
  if (skill.costMP <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(skill.costMP * Math.max(0.5, gameState.player.mpCostRate || 1)));
}

function getPlayerDamageBonus(player, kind, enemy) {
  const baseBonus = kind === "magic" ? (player.magicPower || 0) : (player.physicalPower || 0);
  const weaknessBonus = (player.weaknessExploit || 0) && (enemy.isBoss || enemy.statusAilments?.length)
    ? player.weaknessExploit
    : 0;
  return baseBonus + weaknessBonus + getAttackPowerOffset(player);
}

function applyDamageToPlayer(player, enemy, baseDamage, options = {}) {
  const isMagicLikeAttack = Boolean(options.isMagicLike || enemy.traits?.magicLike);
  const evadeChance = Math.min(0.35, (player.evasionBonus || 0) * 0.04);
  if (evadeChance > 0 && Math.random() < evadeChance) {
    addLog(`ハルトは素早く身をかわし、${enemy.name}の攻撃を回避した。`, "system");
    return 0;
  }

  let damage = Math.max(0, baseDamage + getAttackPowerOffset(enemy) - (player.damageReduction || 0));

  if (isMagicLikeAttack && player.magicGuardCharges > 0) {
    damage = Math.max(0, damage - player.magicGuardReduction);
    player.magicGuardCharges -= 1;
    addLog("マジックガードが発動し、魔力のうねりを打ち消した。", "system");
  } else if (player.guardCharges > 0) {
    damage = Math.max(0, damage - player.guardReduction);
    player.guardCharges -= 1;
    addLog("ガードが発動し、文字の障壁が衝撃を和らげた。", "system");
  }

  player.hp = Math.max(0, player.hp - damage);
  if (gameState.inBattle && gameState.battleContext && damage > 0) {
    gameState.battleContext.playerDamageTaken += damage;
  }
  triggerDamageVisuals(damage, {
    target: "player",
    threshold: Math.max(10, Math.floor(player.maxHp * 0.14)),
    strong: damage >= Math.max(10, Math.floor(player.maxHp * 0.18)),
    extreme: gameState.currentFloor >= 91 && damage >= Math.max(12, Math.floor(player.maxHp * 0.2))
  });
  const attackText = typeof options.attackText === "function"
    ? options.attackText(damage)
    : options.attackText;
  if (attackText !== null) {
    addLog(attackText || `${enemy.name}の攻撃。ハルトは ${damage} ダメージを受けた。`, options.logType || "");
  }

  if (gameState.inBattle && gameState.currentEnemy && player.counterCharges > 0 && damage > 0 && gameState.currentEnemy.hp > 0) {
    player.counterCharges -= 1;
    const counterResult = dealDamageToEnemy(gameState.currentEnemy, player.counterPower + (player.physicalPower || 0), {
      pierceRate: player.defensePenetration || 0,
      accuracyBonus: (player.accuracyBonus || 0) + getPlayerAccuracyPenalty(player),
      damageKind: "physical",
      fromSkill: false
    });
    if (counterResult.hit) {
      addLog(`反撃が発動。${gameState.currentEnemy.name}に ${counterResult.damage} ダメージを返した。`, "system");
    }
  }
  return damage;
}

function executeEnemyAttack(enemy, player, config = {}) {
  const hitCount = randomInt(config.hitsMin || 1, config.hitsMax || 1);
  let totalDamage = 0;
  for (let index = 0; index < hitCount; index += 1) {
    totalDamage += applyDamageToPlayer(player, enemy, randomInt(config.min, config.max) + getAttackPowerOffset(enemy), {
      isMagicLike: Boolean(config.isMagicLike),
      attackText: null
    });
  }

  const finalLogType = config.logType || (player.hp <= 0 ? "danger" : "damage");
  if (hitCount > 1) {
    const text = config.textMulti
      ? fillTemplate(config.textMulti, { damage: totalDamage, enemy: enemy.name })
      : `${enemy.name}の連続攻撃。ハルトは合計 ${totalDamage} ダメージを受けた。`;
    addLog(text, finalLogType);
  } else {
    const text = config.textSingle
      ? fillTemplate(config.textSingle, { damage: totalDamage, enemy: enemy.name })
      : `${enemy.name}の攻撃。ハルトは ${totalDamage} ダメージを受けた。`;
    addLog(text, finalLogType);
  }

  return totalDamage;
}

function handlePlayerDefeat(defeatText) {
  if (gameState.player.reviveCharges > 0) {
    gameState.player.reviveCharges -= 1;
    gameState.player.hp = Math.max(1, Math.floor(gameState.player.maxHp * (gameState.player.reviveHealRatio || 0.3)));
    gameState.player.mp = Math.max(gameState.player.mp, Math.floor(gameState.player.maxMp * 0.25));
    clearAilments(gameState.player);
    addLog("蘇生効果が発動し、ハルトは再び立ち上がった。", "system");
    return true;
  }

  if (gameState.player.deathResist) {
    gameState.player.deathResist = false;
    gameState.player.hp = 1;
    addLog("即死耐性が発動し、ハルトはかろうじて踏みとどまった。", "system");
    return true;
  }

  gameState.inBattle = false;
  gameState.currentEnemy = null;
  gameState.battleContext = null;
  if (gameState.visualEffects.mojiruRewriteActive) {
    applyMojiruVisualRewrite(false);
  }
  resetBattleUi();
  const isAreaEntryFloor = areaOrder.some((areaId) => areaData[areaId].floors.start === gameState.currentFloor && gameState.currentFloor > 1);
  if (!isAreaEntryFloor) {
    gameState.currentFloor = Math.max(1, gameState.currentFloor - 1);
  }
  gameState.player.hp = gameState.player.maxHp;
  gameState.player.mp = gameState.player.maxMp;
  clearAilments(gameState.player);
  syncCurrentArea();
  addLog(defeatText, "danger");
  addLog(
    isAreaEntryFloor
      ? `ハルトは ${gameState.currentFloor}階 で再構成され、全回復して立ち上がった。`
      : `ハルトは ${gameState.currentFloor}階 に押し戻され、全回復して再構成された。`,
    "system"
  );
  return false;
}

function createInitialPlayerState() {
  return {
    name: "ハルト",
    level: 1,
    xp: 0,
    nextXp: calculateNextXp(1),
    hp: 10,
    maxHp: 10,
    mp: 10,
    maxMp: 10,
    sp: 5,
    skills: ["無限成長（説明のみ）"],
    learnedSkillIds: [],
    guardCharges: 0,
    guardReduction: 2,
    magicGuardCharges: 0,
    magicGuardReduction: 0,
    defensePenetration: 0,
    statusResistance: false,
    statusAilments: [],
    accuracyBonus: 0,
    evasionBonus: 0,
    physicalPower: 0,
    magicPower: 0,
    healingPower: 0,
    mpCostRate: 1,
    hpRegen: 0,
    damageReduction: 0,
    counterCharges: 0,
    counterPower: 0,
    reviveCharges: 0,
    reviveHealRatio: 0,
    lifeStealRate: 0,
    weaknessExploit: 0,
    deathResist: false,
    inventory: {
      potion: 2,
      manaPotion: 1
    }
  };
}

function createInitialGameState() {
  return {
    player: createInitialPlayerState(),
    areaId: "forest",
    difficulty: "normal",
    endlessBestFloor: 1,
    currentFloor: 1,
    inBattle: false,
    currentEnemy: null,
    battleContext: null,
    gameOver: false,
      areaCleared: false,
      clearedAreaIds: [],
      skillMenuOpen: false,
      itemMenuOpen: false,
      selectedSkillTier: 5,
      skillTierPageIndex: 0,
      skillTierTabsOpen: true,
      logViewMode: "log",
      skillListOpen: false,
      itemListOpen: false,
    visualEffects: {
      mojiruRewriteActive: false,
      buttonRewriteActive: false
    },
    stats: {
      totalKills: 0,
      totalBossKills: 0,
      hp1VictoryCount: 0,
      noDamageBossWins: 0,
      underLevelBossWins: 0,
      itemsUsed: 0,
      itemsGained: 0,
      defeatedBossFloors: [],
      clearsByDifficulty: {
        normal: 0,
        hard: 0,
        endless: 0
      }
    },
    storyFlags: {},
    pendingEventChoice: null,
    holdFloorMode: false,
    unlockedAchievementIds: [],
    clearCount: 0,
    cycleCount: 0,
    trueEndCleared: false,
    lastEndingType: "normal",
    lastEndingText: "",
    runStats: {
      itemsUsed: 0
    },
    gameCompleted: false,
    logHistory: [],
    saveStatusMessage: "保存データ未確認"
  };
}

const gameState = createInitialGameState();

const ui = {
  appRoot: document.querySelector(".app"),
  bodyRoot: document.body,
  topbarTitleText: document.getElementById("topbarTitleText"),
  battleBanner: document.getElementById("battleBanner"),
  fxToastStack: document.getElementById("fxToastStack"),
  areaText: document.getElementById("areaText"),
  floorText: document.getElementById("floorText"),
  logLevelText: document.getElementById("logLevelText"),
  logXpText: document.getElementById("logXpText"),
  logHpText: document.getElementById("logHpText"),
  logMpText: document.getElementById("logMpText"),
  battleText: document.getElementById("battleText"),
  enemyText: document.getElementById("enemyText"),
  enemyCard: document.getElementById("enemyCard"),
  battleVitals: document.getElementById("battleVitals"),
  logPanel: document.getElementById("logPanel"),
  skillList: document.getElementById("skillList"),
  skillTierTabs: document.getElementById("skillTierTabs"),
  toggleSkillTierTabsButton: document.getElementById("toggleSkillTierTabsButton"),
  itemList: document.getElementById("itemList"),
  skillPanelLabel: document.getElementById("skillPanelLabel"),
  skillSpText: document.getElementById("skillSpText"),
  skillPanelNote: document.getElementById("skillPanelNote"),
  itemPanelLabel: document.getElementById("itemPanelLabel"),
  itemPanelNote: document.getElementById("itemPanelNote"),
  logArea: document.getElementById("logArea"),
  logHeaderLabel: document.getElementById("logHeaderLabel"),
  eventChoicePanel: document.getElementById("eventChoicePanel"),
  eventChoiceText: document.getElementById("eventChoiceText"),
  eventChoiceButtons: document.getElementById("eventChoiceButtons"),
    advanceButton: document.getElementById("advanceButton"),
  attackButton: document.getElementById("attackButton"),
  skillButton: document.getElementById("skillButton"),
  itemButton: document.getElementById("itemButton"),
  escapeButton: document.getElementById("escapeButton"),
  waitButton: document.getElementById("waitButton"),
  achievementButton: document.getElementById("achievementButton"),
  saveButton: document.getElementById("saveButton"),
  loadButton: document.getElementById("loadButton"),
  resetButton: document.getElementById("resetButton"),
  saveStatusText: document.getElementById("saveStatusText"),
  recordText: document.getElementById("recordText"),
  titleOverlay: document.getElementById("titleOverlay"),
  titleRecordText: document.getElementById("titleRecordText"),
  titleContinueButton: document.getElementById("titleContinueButton"),
  titleNewRunButton: document.getElementById("titleNewRunButton"),
  titleDifficultySelect: document.getElementById("titleDifficultySelect"),
  endingOverlay: document.getElementById("endingOverlay"),
  endingTitle: document.getElementById("endingTitle"),
  endingText: document.getElementById("endingText"),
  goTitleButton: document.getElementById("goTitleButton"),
  newCycleButton: document.getElementById("newCycleButton"),
  achievementOverlay: document.getElementById("achievementOverlay"),
  achievementSummaryText: document.getElementById("achievementSummaryText"),
  achievementList: document.getElementById("achievementList"),
  closeAchievementButton: document.getElementById("closeAchievementButton")
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function fillTemplate(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function getLevelBandByFloor(floor) {
  const foundIndex = levelBandTargets.findIndex((target) => floor >= target.floorStart && floor <= target.floorEnd);
  return foundIndex >= 0 ? foundIndex + 1 : levelBandTargets.length;
}

function getBalanceForFloor(floor) {
  return balanceByBand[getLevelBandByFloor(floor)] || balanceByBand[1];
}

function calculateNextXp(level) {
  if (level < 10) {
    return 45 + level * 9;
  }
  if (level < 30) {
    return 120 + (level - 10) * 14;
  }
  if (level < 50) {
    return 400 + (level - 30) * 20;
  }
  if (level < 70) {
    return 800 + (level - 50) * 28;
  }
  if (level < 90) {
    return 1360 + (level - 70) * 36;
  }
  if (level < 110) {
    return 2080 + (level - 90) * 46;
  }
  return 3000 + (level - 110) * 60;
}

function getBossSpRewardForFloor(floor) {
  return bossSpRewardByFloor[floor] || 0;
}

function getCurrentDifficultyConfig() {
  return difficultyConfig[gameState.difficulty] || difficultyConfig.normal;
}

function isEndlessMode() {
  return gameState.difficulty === "endless";
}

function getEndlessScaling(floor) {
  if (!isEndlessMode() || floor <= 100) {
    return { hp: 1, atk: 1, xp: 1, boss: 1 };
  }
  const tier = Math.floor((floor - 101) / 10) + 1;
  return {
    hp: 1 + tier * 0.07,
    atk: 1 + tier * 0.06,
    xp: 1 + tier * 0.08,
    boss: 1 + tier * 0.09
  };
}

function getBossIdForFloor(area, floor) {
  if (area.id === "endless") {
    if (floor % 10 !== 0) {
      return null;
    }
    const index = Math.floor((floor - 100) / 10) - 1;
    const safeIndex = ((index % endlessBossRotation.length) + endlessBossRotation.length) % endlessBossRotation.length;
    return endlessBossRotation[safeIndex];
  }
  return area.bossId;
}

function getAreaById(areaId) {
  return areaData[areaId] || areaData.forest;
}

function getAreaByFloor(floor) {
  if (isEndlessMode() && floor > 100) {
    return endlessAreaData;
  }
  const matchedAreaId = areaOrder.find((areaId) => {
    const area = areaData[areaId];
    return floor >= area.floors.start && floor <= area.floors.end;
  });

  return getAreaById(matchedAreaId || "forest");
}

function syncCurrentArea() {
  const area = getAreaByFloor(gameState.currentFloor);
  gameState.areaId = area.id;
  gameState.areaCleared = gameState.clearedAreaIds.includes(area.id);
  return area;
}

function getCurrentArea() {
  return syncCurrentArea();
}

function isImplementedArea(area) {
  return area.enemies.length > 0 || Boolean(area.bossId);
}

function isBossFloor(area) {
  if (area.id === "endless") {
    return gameState.currentFloor % 10 === 0;
  }
  return area.floors.end === gameState.currentFloor && Boolean(area.bossId);
}

function recoverResource(target, currentKey, maxKey, amount) {
  const recovered = Math.min(target[maxKey] - target[currentKey], amount);
  target[currentKey] += recovered;
  return recovered;
}

function setSaveStatus(message) {
  gameState.saveStatusMessage = message;
  ui.saveStatusText.textContent = message;
}

function getLoopBonusSp() {
  return gameState.clearCount * 2;
}

function countUnlockedTrueFlags() {
  return trueEndRequiredFlags.filter((flag) => Boolean(gameState.storyFlags[flag])).length;
}

function setStoryFlag(flag, value = true, options = {}) {
  if (!flag) {
    return false;
  }
  const nextValue = Boolean(value);
  const prevValue = Boolean(gameState.storyFlags[flag]);
  if (nextValue) {
    gameState.storyFlags[flag] = true;
  } else {
    delete gameState.storyFlags[flag];
  }
  const changed = prevValue !== nextValue;
  if (!changed) {
    return false;
  }

  if (!options.silent && hiddenStoryFlagSet.has(flag) && nextValue) {
    addLog("行間の奥で、見えないフラグが書き換わった。", "rewrite");
    const unlockedCount = countUnlockedTrueFlags();
    if (unlockedCount > 0 && unlockedCount < trueEndRequiredFlags.length) {
      addLog(`真実への断片 ${unlockedCount} / ${trueEndRequiredFlags.length}`, "event");
    }
  }
  return true;
}

function getTrueEndEvaluation() {
  const unlockedCount = countUnlockedTrueFlags();
  const hasRequiredFlags = unlockedCount >= trueEndRequiredFlags.length;
  const cycleRequirement = gameState.cycleCount >= 1;
  const floorRequirement = gameState.currentFloor >= 100;
  const bossRequirement = gameState.stats.defeatedBossFloors.includes(100);
  return {
    unlockedCount,
    hasRequiredFlags,
    cycleRequirement,
    floorRequirement,
    bossRequirement,
    canTrigger: hasRequiredFlags && cycleRequirement && floorRequirement && bossRequirement
  };
}

function isTrueEndCleared() {
  return Boolean(gameState.trueEndCleared);
}

function updateRecordUi() {
  const difficultyLabel = getCurrentDifficultyConfig().label;
  const endlessText = isEndlessMode() ? ` / Endless最高: ${gameState.endlessBestFloor}階` : "";
  const trueEndText = isTrueEndCleared() ? " / True End Clear" : "";
  const summary = `難易度: ${difficultyLabel} / クリア回数: ${gameState.clearCount} / 周回: ${gameState.cycleCount} / 周回SP: +${getLoopBonusSp()}${endlessText}${trueEndText}`;
  ui.recordText.textContent = summary;
  ui.titleRecordText.textContent = `難易度: ${difficultyLabel} / クリア回数: ${gameState.clearCount} / 周回: ${gameState.cycleCount}${endlessText}${trueEndText}`;
  if (ui.titleDifficultySelect) {
    ui.titleDifficultySelect.value = gameState.difficulty;
  }
}

function getEndingText() {
  const normalFirst = "創造神モジールを討った瞬間、塔を構成していた文字は白い光になってほどけた。ハルトの足元から世界は消え、気づけば見覚えのある空の下に立っていた。";
  const normalRepeat = "再び創造神モジールを越えたとき、ハルトは理解する。脱出とは終わりではなく、選び直しの権利だ。現実へ戻る道の横に、もうひとつの扉が静かに開いていた。";
  const trueEnding = "創造神モジールの崩壊とともに、塔は終わらなかった。ページの外側に、誰にも読まれていない余白があった。そこでハルトは知る。モジールは創造主ではなく、崩壊を遅らせるための管理者にすぎないことを。消されたはずの行が彼の名を呼ぶ。『帰還先は現実ではない。君が次に書く一文こそが世界だ』。光の扉は開いたまま揺れ、ハルトは自分の意志で最後の句点を打たずに歩き出した。";
  if (gameState.lastEndingType === "true") {
    return trueEnding;
  }
  return gameState.clearCount <= 1 ? normalFirst : normalRepeat;
}

function getEndingTitle() {
  return gameState.lastEndingType === "true" ? "真エンディング" : "エンディング";
}

function showTitleOverlay() {
  if (ui.titleDifficultySelect) {
    ui.titleDifficultySelect.value = gameState.difficulty;
  }
  if (isTrueEndCleared()) {
    const rewritten = applyTextCorruption("転移したのはテキスト世界だった件", 0.2);
    ui.topbarTitleText.textContent = `${rewritten} [TRUE]`;
    setTimeout(() => {
      if (!gameState.visualEffects.mojiruRewriteActive) {
        ui.topbarTitleText.textContent = "転移したのはテキスト世界だった件 [TRUE]";
      }
    }, 900);
  }
  ui.titleOverlay.classList.remove("is-collapsed");
}

function hideTitleOverlay() {
  ui.titleOverlay.classList.add("is-collapsed");
}

function showEndingOverlay() {
  gameState.lastEndingText = getEndingText();
  if (ui.endingTitle) {
    ui.endingTitle.textContent = getEndingTitle();
  }
  ui.endingText.textContent = gameState.lastEndingText;
  ui.endingOverlay.classList.remove("is-collapsed");
}

function hideEndingOverlay() {
  ui.endingOverlay.classList.add("is-collapsed");
}

function applyTextCorruption(text, strength = 0.16) {
  const chars = String(text).split("");
  const glitchChars = ["#", "@", "%", "&", "?", "=", ":", "/", "\\", "¦", "░"];
  return chars
    .map((char) => {
      if (char === " " || char === "　" || /[。、！？」「・]/.test(char)) {
        return char;
      }
      return Math.random() < strength ? glitchChars[randomInt(0, glitchChars.length - 1)] : char;
    })
    .join("");
}

function queueUiEffect(effectClass, duration = 360) {
  if (!ui.appRoot) {
    return;
  }
  if (effectClass === "fx-shake" || effectClass === "fx-shake-strong" || effectClass === "fx-flash") {
    return;
  }
  ui.appRoot.classList.add(effectClass);
  setTimeout(() => {
    ui.appRoot.classList.remove(effectClass);
  }, duration);
}

function addCorruptedLog(message, options = {}) {
  const text = message || "---- ERROR : TEXT COLLAPSE ----";
  return addLog(applyTextCorruption(text, options.strength ?? 0.22), "corrupt");
}

function scheduleLogRewrite(entryId, rewrittenMessage, delayMs = 1000) {
  setTimeout(() => {
    const target = gameState.logHistory.find((entry) => entry.id === entryId);
    if (!target) {
      return;
    }
    target.message = rewrittenMessage;
    target.type = "rewrite";
    if (gameState.logViewMode === "log") {
      renderLogArea();
    }
  }, delayMs);
}

function addRewrittenLog(initialMessage, rewrittenMessage, delayMs = 1000, initialType = "system") {
  const entryId = addLog(initialMessage, initialType);
  scheduleLogRewrite(entryId, rewrittenMessage, delayMs);
  return entryId;
}

function applyTemporaryButtonLabels(labelMap = {}, durationMs = 2400) {
  const attackLabel = labelMap.attack || defaultLabelMap.attack;
  const skillLabel = labelMap.skill || defaultLabelMap.skill;
  const itemLabel = labelMap.item || defaultLabelMap.item;
  ui.attackButton.textContent = attackLabel;
  ui.skillButton.textContent = skillLabel;
  ui.itemButton.textContent = itemLabel;
  if (textEffectTimer !== null) {
    clearTimeout(textEffectTimer);
    textEffectTimer = null;
  }
  textEffectTimer = setTimeout(() => {
    ui.attackButton.textContent = defaultLabelMap.attack;
    ui.skillButton.textContent = defaultLabelMap.skill;
    ui.itemButton.textContent = defaultLabelMap.item;
    textEffectTimer = null;
  }, durationMs);
}

function applyMojiruVisualRewrite(active) {
  gameState.visualEffects.mojiruRewriteActive = Boolean(active);
  if (active) {
    applyTemporaryButtonLabels(mojiruLabelMap, 3000);
    ui.topbarTitleText.textContent = applyTextCorruption("転移したのはテキスト世界だった件", 0.24);
    ui.topbarTitleText.classList.add("is-glitching");
    ui.logPanel.classList.add("is-world-rewrite");
    return;
  }

  if (textEffectTimer !== null) {
    clearTimeout(textEffectTimer);
    textEffectTimer = null;
  }
  ui.attackButton.textContent = defaultLabelMap.attack;
  ui.skillButton.textContent = defaultLabelMap.skill;
  ui.itemButton.textContent = defaultLabelMap.item;
  ui.topbarTitleText.textContent = "転移したのはテキスト世界だった件";
  ui.topbarTitleText.classList.remove("is-glitching");
  ui.logPanel.classList.remove("is-world-rewrite");
}

function applyTransientClass(target, className, duration = 320) {
  if (!target) {
    return;
  }
  target.classList.add(className);
  setTimeout(() => {
    target.classList.remove(className);
  }, duration);
}

function showBattleBanner(text, type = "boss", duration = 1100) {
  if (!ui.battleBanner) {
    return;
  }
  ui.battleBanner.textContent = text;
  ui.battleBanner.className = `battle-banner battle-banner--${type}`;
  setTimeout(() => {
    ui.battleBanner.classList.add("is-collapsed");
  }, duration);
}

function showFxToast(title, detail = "", type = "achievement", duration = 2200) {
  if (!ui.fxToastStack) {
    return;
  }
  const toast = document.createElement("div");
  toast.className = `fx-toast fx-toast--${type}`;
  toast.innerHTML = `<strong>${title}</strong>${detail ? `<span>${detail}</span>` : ""}`;
  ui.fxToastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-out");
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

function triggerDamageVisuals(damage, options = {}) {
  if (damage <= 0) {
    return;
  }

  const strongHit = options.strong || damage >= (options.threshold || 14);
  if (strongHit) {
    if (options.target === "player") {
      showBattleBanner(options.extreme ? "FATAL STRIKE" : "HEAVY DAMAGE", "damage", options.extreme ? 900 : 680);
    }
    queueUiEffect(options.extreme ? "fx-shake-strong" : "fx-shake", options.extreme ? 300 : 210);
  }
}

function getAchievementById(id) {
  return achievementData.find((achievement) => achievement.id === id) || null;
}

function isAchievementUnlocked(id) {
  return gameState.unlockedAchievementIds.includes(id);
}

// Achievement conditions are resolved via handler lookup to keep additions localized.
const achievementConditionHandlers = {
  floor_reached: (value) => gameState.currentFloor >= value,
  boss_floor_defeated: (value) => gameState.stats.defeatedBossFloors.includes(value),
  total_kills_at_least: (value) => gameState.stats.totalKills >= value,
  hp1_victory_count_at_least: (value) => gameState.stats.hp1VictoryCount >= value,
  boss_no_damage_wins_at_least: (value) => gameState.stats.noDamageBossWins >= value,
  under_level_boss_wins_at_least: (value) => gameState.stats.underLevelBossWins >= value,
  player_level_at_least: (value) => gameState.player.level >= value,
  learned_skills_at_least: (value) => gameState.player.learnedSkillIds.length >= value,
  items_used_at_least: (value) => gameState.stats.itemsUsed >= value,
  items_gained_at_least: (value) => gameState.stats.itemsGained >= value,
  cycle_count_at_least: (value) => gameState.cycleCount >= value,
  clear_count_at_least: (value) => gameState.clearCount >= value,
  story_flag_true: (value) => Boolean(gameState.storyFlags[String(value)]),
  story_flag_count_at_least: (value) => countUnlockedTrueFlags() >= Number(value || 0),
  true_end_reached: () => isTrueEndCleared(),
  endless_best_floor_at_least: (value) => gameState.endlessBestFloor >= Number(value || 0),
  clear_on_difficulty_at_least: (value) => {
    const raw = String(value || "");
    const parts = raw.split(":");
    const difficulty = parts[0];
    const count = Math.max(1, Number(parts[1] || 1));
    return (gameState.stats.clearsByDifficulty?.[difficulty] || 0) >= count;
  }
};

function evaluateAchievementCondition(achievement) {
  const handler = achievementConditionHandlers[achievement.conditionType];
  if (!handler) {
    return false;
  }
  return Boolean(handler(achievement.conditionValue, achievement));
}

function renderAchievementList() {
  if (!ui.achievementList || !ui.achievementSummaryText) {
    return;
  }
  ui.achievementList.innerHTML = "";
  const unlockedCount = achievementData.filter((achievement) => isAchievementUnlocked(achievement.id)).length;
  ui.achievementSummaryText.textContent = `達成 ${unlockedCount} / ${achievementData.length}`;

  achievementData.forEach((achievement) => {
    const unlocked = isAchievementUnlocked(achievement.id);
    const item = document.createElement("article");
    item.className = `achievement-item${unlocked ? " is-unlocked" : ""}`;
    const name = unlocked || !achievement.isHidden ? achievement.name : "？？？";
    const description = unlocked || !achievement.isHidden ? achievement.description : "条件不明";
    item.innerHTML = `
      <strong>${name}</strong>
      <span>${achievement.category} / ${unlocked ? "達成済み" : "未達成"}</span>
      <p>${description}</p>
    `;
    ui.achievementList.appendChild(item);
  });
}

function showAchievementOverlay() {
  renderAchievementList();
  ui.achievementOverlay.classList.remove("is-collapsed");
}

function hideAchievementOverlay() {
  ui.achievementOverlay.classList.add("is-collapsed");
}

function unlockAchievementById(id) {
  const achievement = getAchievementById(id);
  if (!achievement || isAchievementUnlocked(id)) {
    return false;
  }
  gameState.unlockedAchievementIds.push(id);
  addLog(`【実績解除】${achievement.name} - ${achievement.description}`, "achievement");
  showFxToast("ACHIEVEMENT UNLOCKED", achievement.name, "achievement", 2600);
  queueUiEffect("fx-flash", 260);
  renderAchievementList();
  return true;
}

function checkAchievements() {
  achievementData.forEach((achievement) => {
    if (!isAchievementUnlocked(achievement.id) && evaluateAchievementCondition(achievement)) {
      unlockAchievementById(achievement.id);
    }
  });
}

function unlockAchievement(id, title, detail = "") {
  const found = getAchievementById(id);
  if (found) {
    return unlockAchievementById(id);
  }
  if (!id || isAchievementUnlocked(id)) {
    return false;
  }
  gameState.unlockedAchievementIds.push(id);
  addLog(`実績解除: ${title}${detail ? ` - ${detail}` : ""}`, "achievement");
  showFxToast("ACHIEVEMENT UNLOCKED", title, "achievement", 2600);
  renderAchievementList();
  return true;
}

function triggerTextWorldEffectByScene() {
  const area = getCurrentArea();
  const floor = gameState.currentFloor;
  if (floor < 81) {
    return;
  }

  const chance = floor >= 100 ? 0.55 : floor >= 91 ? 0.35 : 0.2;
  if (Math.random() > chance) {
    return;
  }

  const samples = [
    "文字列が乱れている……",
    "世\x95界の記述が破損している",
    "---- ERROR : TEXT COLLAPSE ----"
  ];
  const message = samples[randomInt(0, samples.length - 1)];
  addCorruptedLog(message, { strength: floor >= 91 ? 0.34 : 0.2 });
  queueUiEffect("fx-log-flicker", 380);

  if (area.id === "creator" && Math.random() < 0.45) {
    const rewriteId = addRewrittenLog("ハルトは世界を観測した。", "ハルトは観測されている。", 1100, "system");
    if (rewriteId) {
      queueUiEffect("fx-shake", 260);
    }
  }
}

function renderLogArea() {
  ui.logArea.innerHTML = "";
  ui.logHeaderLabel.textContent = gameState.logViewMode === "status" ? "主人公ステータス" : "テキストログ";

  if (gameState.logViewMode === "status") {
    const player = gameState.player;
    const learnedSkills = [...player.skills, ...getLearnedSkillNames()].join("、");
    const ailments = getStatusEffectLabels(player).join("、");
    const statusView = document.createElement("div");
    statusView.className = "status-log";
    statusView.innerHTML = `
      <div class="status-item"><span class="label">名前</span><strong>${player.name}</strong></div>
      <div class="status-item"><span class="label">LV</span><strong>${player.level}</strong></div>
      <div class="status-item"><span class="label">XP</span><strong>${player.xp} / ${player.nextXp}</strong></div>
      <div class="status-item"><span class="label">SP</span><strong>${player.sp}</strong></div>
      <div class="status-item"><span class="label">HP</span><strong>${player.hp} / ${player.maxHp}</strong></div>
      <div class="status-item"><span class="label">MP</span><strong>${player.mp} / ${player.maxMp}</strong></div>
      <div class="status-item"><span class="label">状態異常</span><strong>${ailments}</strong></div>
      <div class="status-item status-item--wide"><span class="label">スキル</span><strong>${learnedSkills}</strong></div>
    `;
    ui.logArea.appendChild(statusView);
    return;
  }

  gameState.logHistory.forEach((entry) => {
    const line = document.createElement("p");
    line.className = `log-entry${entry.type ? ` log-entry--${entry.type}` : ""}`;
    if (entry.type === "corrupt" || entry.type === "rewrite") {
      line.classList.add("log-entry--glitch");
    }
    line.textContent = entry.message;
    ui.logArea.appendChild(line);
  });

  ui.logArea.scrollTop = ui.logArea.scrollHeight;
}

function addLog(message, type = "") {
  const entry = { id: ++logEntryCounter, message, type };
  gameState.logHistory.push(entry);
  if (gameState.logHistory.length > MAX_LOG_ENTRIES) {
    gameState.logHistory = gameState.logHistory.slice(-MAX_LOG_ENTRIES);
  }
  if (gameState.logViewMode === "log") {
    renderLogArea();
  }
  if (type === "phase") {
    showBattleBanner("PHASE SHIFT", "phase", 980);
    queueUiEffect(gameState.currentFloor >= 91 ? "fx-shake-strong" : "fx-shake", gameState.currentFloor >= 91 ? 260 : 200);
    applyTransientClass(ui.logPanel, "fx-panel-flash", 260);
  }
  return entry.id;
}

function getLearnedSkillNames() {
  return gameState.player.learnedSkillIds.map((skillId) => skillData[skillId].name);
}

function getItemCount(itemId) {
  return gameState.player.inventory[itemId] || 0;
}

function updateStatus() {
  const { player, currentFloor, currentEnemy, inBattle } = gameState;
  const area = getCurrentArea();
  const difficultyLabel = getCurrentDifficultyConfig().label;
  ui.appRoot.classList.toggle("is-hard-mode", gameState.difficulty === "hard");

  ui.areaText.textContent = area.name;
  ui.floorText.textContent = `${currentFloor}階`;
  ui.logLevelText.textContent = String(player.level);
  ui.logXpText.textContent = `${player.xp} / ${player.nextXp}`;
  ui.logHpText.textContent = `${player.hp} / ${player.maxHp}`;
  ui.logMpText.textContent = `${player.mp} / ${player.maxMp}`;

  if (inBattle && currentEnemy) {
    ui.battleText.textContent = `${currentEnemy.isBoss ? "大ボス戦" : "戦闘中"} [${difficultyLabel}]`;
    const enemyStatuses = getStatusEffectLabels(currentEnemy);
    const bossStatuses = getBossSpecialStateLabels(currentEnemy);
    const mergedStatuses = [...enemyStatuses, ...bossStatuses].filter((value, index, self) => self.indexOf(value) === index);
    const displayStatuses = mergedStatuses.length > 1 ? mergedStatuses.filter((label) => label !== "なし") : mergedStatuses;
    ui.enemyText.textContent = `${currentEnemy.name} HP: ${currentEnemy.hp} / ${currentEnemy.maxHp} | 状態: ${displayStatuses.join("、")}`;
    return;
  }

  if (gameState.areaCleared) {
    ui.battleText.textContent = `${area.name}制覇 [${difficultyLabel}]`;
    ui.enemyText.textContent = `${area.name}を突破した。次の階層群はまだ実装されていない。`;
    return;
  }

  if (gameState.gameOver) {
    ui.battleText.textContent = `敗北 [${difficultyLabel}]`;
    ui.enemyText.textContent = "ハルトの視界が暗転し、世界は未完の一文のまま閉じた。";
    return;
  }

  ui.battleText.textContent = `探索中 [${difficultyLabel}]`;
  ui.enemyText.textContent = `${area.name}を探索中。次の一歩を選べる。`;
}

function updateButtons() {
  const pendingChoice = getPendingChoiceContext();
  const choiceLock = Boolean(pendingChoice);
  const combatEnabled = gameState.inBattle && !gameState.gameOver;
  const advanceEnabled = !choiceLock && !gameState.inBattle && !gameState.gameOver && !gameState.areaCleared;
  const statusEnabled = !choiceLock && !gameState.inBattle && !gameState.gameOver;
  const skillEnabled = !choiceLock && !gameState.gameOver;
  const area = getCurrentArea();
  const waitEnabled = !choiceLock
    && !gameState.gameOver
    && !gameState.areaCleared
    && !isBossFloor(area)
    && (!gameState.inBattle || (gameState.currentEnemy && !gameState.currentEnemy.isBoss));

  ui.advanceButton.classList.toggle("is-hidden", gameState.inBattle);
  ui.attackButton.classList.toggle("is-hidden", !gameState.inBattle);
  ui.advanceButton.disabled = pendingChoice ? pendingChoice.choices.length < 1 : !advanceEnabled;
  ui.attackButton.disabled = !combatEnabled;
  ui.skillButton.disabled = pendingChoice ? pendingChoice.choices.length < 2 : !skillEnabled;
  ui.itemButton.disabled = pendingChoice ? pendingChoice.choices.length < 3 : gameState.gameOver || choiceLock;
  ui.escapeButton.disabled = !statusEnabled;
  ui.waitButton.disabled = !waitEnabled;
  ui.waitButton.textContent = gameState.holdFloorMode ? "待機中" : "待機";
  applyChoiceButtonLabels(pendingChoice);
}
function hasSkill(skillId) {
  return gameState.player.learnedSkillIds.includes(skillId);
}

function getActiveSkills() {
  return Object.values(skillData).filter((skill) => skill.type === "active" && hasSkill(skill.id));
}

function getSkillStatus(skill) {
  if (hasSkill(skill.id)) {
    return { label: "取得済み", className: "learned" };
  }

  if (gameState.player.sp >= skill.costSP) {
    return { label: "取得可能", className: "ready" };
  }

  return { label: "SP不足", className: "locked" };
}

function getSkillTierValues() {
  const baseTiers = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const skillTiers = Object.values(skillData).map((skill) => skill.costSP);
  return [...new Set([...baseTiers, ...skillTiers])].sort((a, b) => a - b);
}

function renderSkillTierTabs() {
  const showTabs = !gameState.inBattle || !gameState.skillMenuOpen;
  ui.skillSpText.textContent = `現在SP: ${gameState.player.sp}`;
  ui.skillTierTabs.classList.toggle("is-collapsed", !showTabs || !gameState.skillTierTabsOpen);
  ui.toggleSkillTierTabsButton.classList.toggle("is-collapsed", !showTabs || gameState.skillTierTabsOpen);

  if (!showTabs) {
    ui.skillTierTabs.innerHTML = "";
    return;
  }

  if (!gameState.skillTierTabsOpen) {
    ui.toggleSkillTierTabsButton.textContent = "開く";
    ui.skillTierTabs.innerHTML = "";
    return;
  }

  const tiers = getSkillTierValues();
  const pageSize = 6;
  if (!tiers.includes(gameState.selectedSkillTier)) {
    gameState.selectedSkillTier = tiers[0] || 5;
  }
  const maxPageIndex = Math.max(0, Math.ceil(tiers.length / pageSize) - 1);
  gameState.skillTierPageIndex = Math.min(Math.max(0, gameState.skillTierPageIndex || 0), maxPageIndex);

  const selectedIndex = tiers.indexOf(gameState.selectedSkillTier);
  if (selectedIndex >= 0) {
    gameState.skillTierPageIndex = Math.floor(selectedIndex / pageSize);
  }

  ui.skillTierTabs.innerHTML = "";
  const start = gameState.skillTierPageIndex * pageSize;
  const visibleTiers = tiers.slice(start, start + pageSize);

  visibleTiers.forEach((tier) => {
    const button = document.createElement("button");
    button.className = `button skill-tier-tab${tier === gameState.selectedSkillTier ? " is-active" : ""}`;
    button.textContent = `${tier}p`;
    button.disabled = gameState.gameOver;
    button.addEventListener("click", () => {
      gameState.selectedSkillTier = tier;
      gameState.skillTierTabsOpen = false;
      renderSkillList();
    });
    ui.skillTierTabs.appendChild(button);
  });

  if (start > 0) {
    const prevButton = document.createElement("button");
    prevButton.className = "button skill-tier-tab";
    prevButton.textContent = "←";
    prevButton.disabled = gameState.gameOver;
    prevButton.addEventListener("click", () => {
      gameState.skillTierPageIndex = Math.max(0, gameState.skillTierPageIndex - 1);
      const prevStart = gameState.skillTierPageIndex * pageSize;
      gameState.selectedSkillTier = tiers[prevStart];
      renderSkillList();
    });
    ui.skillTierTabs.prepend(prevButton);
  }

  if (start + pageSize < tiers.length) {
    const nextButton = document.createElement("button");
    nextButton.className = "button skill-tier-tab";
    nextButton.textContent = "→";
    nextButton.disabled = gameState.gameOver;
    nextButton.addEventListener("click", () => {
      gameState.skillTierPageIndex = Math.min(maxPageIndex, gameState.skillTierPageIndex + 1);
      const nextStart = gameState.skillTierPageIndex * pageSize;
      gameState.selectedSkillTier = tiers[nextStart];
      renderSkillList();
    });
    ui.skillTierTabs.appendChild(nextButton);
  }
}

function renderSkillList() {
  ui.skillList.classList.toggle("is-collapsed", !gameState.skillListOpen);
  ui.skillPanelLabel.textContent = gameState.inBattle && gameState.skillMenuOpen ? "戦闘スキル" : "スキル一覧";
  ui.skillPanelNote.textContent = gameState.inBattle && gameState.skillMenuOpen
    ? "使用可能なアクティブスキルを選択。MP不足なら使えない。"
    : "SPを使って取得。戦闘中はアクティブスキルのみ使用可能。";
  renderSkillTierTabs();

  if (!gameState.skillListOpen) {
    ui.skillList.innerHTML = "";
    return;
  }

  ui.skillList.innerHTML = "";

  if (gameState.inBattle && gameState.skillMenuOpen && !gameState.gameOver) {
    const activeSkills = getActiveSkills();
    if (activeSkills.length === 0) {
      const emptyText = document.createElement("p");
      emptyText.className = "panel-note";
      emptyText.textContent = "まだ使用できるアクティブスキルを習得していない。";
      ui.skillList.appendChild(emptyText);
      return;
    }

    activeSkills.forEach((skill) => {
      const requiredMp = getSkillMpCost(skill);
      const canUse = gameState.player.mp >= requiredMp;
      const wrapper = document.createElement("div");
      wrapper.className = "skill-card";
      wrapper.innerHTML = `<p>${skill.description}</p>`;

      const button = document.createElement("button");
      button.className = "button";
      button.textContent = `${skill.name} (${requiredMp} MP)`;
      button.disabled = !canUse;
      button.addEventListener("click", () => useLearnedSkill(skill.id));
      wrapper.appendChild(button);

      if (!canUse) {
        const note = document.createElement("p");
        note.className = "panel-note";
        note.textContent = "MP不足";
        wrapper.appendChild(note);
      }

      ui.skillList.appendChild(wrapper);
    });
    return;
  }

  Object.values(skillData)
    .filter((skill) => skill.costSP === gameState.selectedSkillTier)
    .forEach((skill) => {
    const skillCard = document.createElement("article");
    const status = getSkillStatus(skill);
    skillCard.className = "skill-card";

    const metaParts = [
      `種別: ${skill.type === "active" ? "アクティブ" : "パッシブ"}`,
      `必要SP: ${skill.costSP}`
    ];

    if (skill.type === "active") {
      metaParts.push(`消費MP: ${getSkillMpCost(skill)}`);
    }

    skillCard.innerHTML = `
      <div class="skill-card__head">
        <strong>${skill.name}</strong>
        <span class="skill-card__status skill-card__status--${status.className}">${status.label}</span>
      </div>
      <div class="skill-card__meta">${metaParts.map((part) => `<span>${part}</span>`).join("")}</div>
      <p>${skill.description}</p>
    `;

    const learnButton = document.createElement("button");
    learnButton.className = "button";
    learnButton.textContent = hasSkill(skill.id) ? "取得済み" : "取得";
    learnButton.disabled = hasSkill(skill.id) || gameState.player.sp < skill.costSP || gameState.gameOver;
    learnButton.addEventListener("click", () => learnSkill(skill.id));
    skillCard.appendChild(learnButton);
    ui.skillList.appendChild(skillCard);
    });
}

function renderItemList() {
  ui.itemList.classList.toggle("is-collapsed", !gameState.itemListOpen);
  ui.itemPanelLabel.textContent = gameState.itemMenuOpen ? "アイテム使用" : "アイテム一覧";
  ui.itemPanelNote.textContent = gameState.itemMenuOpen
    ? "所持アイテムから使うものを選択。戦闘中の使用後は敵ターンへ移る。"
    : "戦闘中でも探索中でも使用可能。";

  if (!gameState.itemListOpen) {
    ui.itemList.innerHTML = "";
    return;
  }

  ui.itemList.innerHTML = "";

  if (gameState.itemMenuOpen && !gameState.gameOver) {
    const items = Object.values(itemData);
    const hasAnyItem = items.some((item) => getItemCount(item.id) > 0);

    if (!hasAnyItem) {
      const emptyText = document.createElement("p");
      emptyText.className = "panel-note";
      emptyText.textContent = "使えるアイテムがない。ポケットには空白だけが残っている。";
      ui.itemList.appendChild(emptyText);
      return;
    }

    items.forEach((item) => {
      const count = getItemCount(item.id);
      const wrapper = document.createElement("div");
      wrapper.className = "skill-card";
      wrapper.innerHTML = `
        <div class="skill-card__head">
          <strong>${item.name}</strong>
          <span class="skill-card__status skill-card__status--${count > 0 ? "ready" : "locked"}">所持 ${count}</span>
        </div>
        <p>${item.description}</p>
      `;

      const button = document.createElement("button");
      button.className = "button";
      button.textContent = "使う";
      button.disabled = count <= 0;
      button.addEventListener("click", () => useItemById(item.id));
      wrapper.appendChild(button);

      ui.itemList.appendChild(wrapper);
    });
    return;
  }

  Object.values(itemData).forEach((item) => {
    const itemCard = document.createElement("article");
    const count = getItemCount(item.id);
    itemCard.className = "skill-card";
    itemCard.innerHTML = `
      <div class="skill-card__head">
        <strong>${item.name}</strong>
        <span class="skill-card__status skill-card__status--${count > 0 ? "ready" : "locked"}">所持 ${count}</span>
      </div>
      <div class="skill-card__meta"><span>対象: 自分</span><span>使用可能: 戦闘内外</span></div>
      <p>${item.description}</p>
    `;

    const useButton = document.createElement("button");
    useButton.className = "button";
    useButton.textContent = "使用";
    useButton.disabled = count <= 0 || gameState.gameOver;
    useButton.addEventListener("click", () => useItemById(item.id));
    itemCard.appendChild(useButton);
    ui.itemList.appendChild(itemCard);
  });
}

function render() {
  updateStatus();
  updateButtons();
  renderSkillList();
  renderItemList();
  renderEventChoicePanel();
  renderLogArea();
  renderAchievementList();
  updateRecordUi();
  ui.saveStatusText.textContent = gameState.saveStatusMessage;
  scheduleAutoSave();
}

function createEnemy(enemyId) {
  const template = enemyData[enemyId];
  const balance = getBalanceForFloor(gameState.currentFloor);
  const difficulty = getCurrentDifficultyConfig();
  const endlessScale = getEndlessScaling(gameState.currentFloor);
  const difficultyHp = difficulty.enemyHpMultiplier * endlessScale.hp;
  const difficultyAtk = difficulty.enemyAtkMultiplier * endlessScale.atk;
  const difficultyXp = difficulty.enemyXpMultiplier * endlessScale.xp;
  const bossDifficulty = template.isBoss ? difficulty.bossMultiplier * endlessScale.boss : 1;
  const hpMultiplier = template.isBoss ? balance.bossHpMult : balance.hpMult;
  const atkMultiplier = template.isBoss ? balance.bossAtkMult : balance.atkMult;
  const defenseBonus = template.isBoss ? balance.bossDefAdd : balance.defAdd;
  const xpMultiplier = template.isBoss ? balance.bossXpMult : balance.xpMult;
  const maxHp = Math.max(1, Math.floor(template.maxHp * hpMultiplier * difficultyHp * bossDifficulty));
  const attackMin = Math.max(1, Math.floor(template.attackMin * atkMultiplier * difficultyAtk * bossDifficulty));
  const attackMax = Math.max(attackMin, Math.floor(template.attackMax * atkMultiplier * difficultyAtk * bossDifficulty));
  const defense = Math.max(0, (template.defense || 0) + defenseBonus);
  const xp = Math.max(1, Math.floor(template.xp * xpMultiplier * difficultyXp));

  return {
    ...template,
    maxHp,
    hp: maxHp,
    attackMin,
    attackMax,
    atk: { min: attackMin, max: attackMax },
    xp,
    gimmickType: getBossGimmick(template)?.gimmickType || null,
    baseDefense: defense,
    defense,
    def: defense,
    spReward: template.isBoss ? (template.spReward ?? getBossSpRewardForFloor(gameState.currentFloor)) : 0,
    evadeChance: template.evadeChance || 0,
    attackHitsMin: template.attackHitsMin || 1,
    attackHitsMax: template.attackHitsMax || 1,
    traits: { ...(template.traits || {}) },
    skillIds: [...(template.skillIds || [])],
    statusAilments: [],
    bossState: template.isBoss ? createBossState(template) : null
  };
}

function tryEnemyEvade(enemy, accuracyBonus = 0) {
  const adjustedEvadeChance = Math.max(0, (enemy.evadeChance || 0) - accuracyBonus * 0.03);
  return adjustedEvadeChance > 0 && Math.random() < adjustedEvadeChance;
}

function dealDamageToEnemy(enemy, baseDamage, options = {}) {
  if (tryEnemyEvade(enemy, options.accuracyBonus || 0)) {
    return { hit: false, damage: 0 };
  }

  const defenseValue = enemy.defense || 0;
  const ignoredDefense = options.ignoreDefense ? defenseValue : Math.min(defenseValue, options.pierceRate || 0);
  let damage = Math.max(1, baseDamage - Math.max(0, defenseValue - ignoredDefense));
  const gimmickResult = applyBossIncomingDamageGimmick(enemy, damage, options);
  if (gimmickResult.blocked) {
    return { hit: false, damage: 0 };
  }
  damage = Math.max(1, Math.floor(gimmickResult.damage ?? damage));
  enemy.hp = Math.max(0, enemy.hp - damage);
  return { hit: true, damage };
}

function resetBattleUi() {
  gameState.skillMenuOpen = false;
  gameState.itemMenuOpen = false;
  gameState.skillListOpen = false;
  gameState.itemListOpen = false;
  gameState.player.guardCharges = 0;
  gameState.player.guardReduction = 2;
  gameState.player.magicGuardCharges = 0;
  gameState.player.magicGuardReduction = 0;
}

function startBattle(enemyId) {
  gameState.currentEnemy = createEnemy(enemyId);
  gameState.inBattle = true;
  gameState.battleContext = {
    playerDamageTaken: 0
  };
  gameState.player.guardCharges = 0;
  resetBattleUi();
  if (gameState.currentEnemy.isBoss) {
    addLog("=== 大ボス戦 ===", "boss");
    showBattleBanner("BOSS BATTLE", "boss", 1300);
    queueUiEffect("fx-flash", 300);
    queueUiEffect("fx-shake", 220);
    if (gameState.currentFloor >= 91) {
      addCorruptedLog("---- WARNING : BOSS TEXT OVERRIDE ----", { strength: 0.3 });
    }
    if (gameState.currentEnemy.id === "mojiru") {
      applyMojiruVisualRewrite(true);
      showBattleBanner("WORLD REWRITE", "rewrite", 1500);
      addRewrittenLog("創造神モジールが静かに名を告げる。", "創造神モジールがあなたの定義を書き換える。", 1200, "boss");
      const truthProgress = countUnlockedTrueFlags();
      if (truthProgress >= 3 && !gameState.storyFlags.metUnknownEntity) {
        setStoryFlag("metUnknownEntity", true);
        addRewrittenLog("モジールの背後に空白が見える。", "モジールの背後で、誰かが改稿している。", 1000, "boss");
      }
      if (truthProgress >= 4) {
        addRewrittenLog("ハルトは剣を構えた。", "ハルトは『前回もここで戦った』と理解している。", 1150, "rewrite");
      }
    }
    runBossBattleStart(gameState.currentEnemy, gameState.player);
  }
  addLog(gameState.currentEnemy.appearText, gameState.currentEnemy.isBoss ? "boss" : "system");
  render();
}

function gainXp(amount) {
  const player = gameState.player;
  player.xp += amount;
  addLog(`XPを ${amount} 獲得した！`, "system");

  while (player.xp >= player.nextXp) {
    player.xp -= player.nextXp;
    player.level += 1;
    player.nextXp = calculateNextXp(player.level);
    player.sp += 2;
    const hpGain = 5 + Math.floor(player.level / 20);
    const mpGain = 4 + Math.floor(player.level / 25);
    player.maxHp += hpGain;
    player.maxMp += mpGain;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    addLog(`レベルが上がった！ LV ${player.level} になった！`, "levelup");
    addLog(`HP+${hpGain} / MP+${mpGain} / SP+2。ステータスが全回復した。`, "heal");
    showBattleBanner("LEVEL UP!", "levelup", 980);
    applyTransientClass(ui.battleVitals, "fx-levelup", 520);
    showFxToast("LEVEL UP", `LV ${player.level}`, "levelup", 1400);
  }
  checkAchievements();
}

function addItem(itemId, amount = 1) {
  if (!itemData[itemId]) {
    return;
  }

  gameState.player.inventory[itemId] = getItemCount(itemId) + amount;
  gameState.stats.itemsGained += Math.max(0, amount);
  checkAchievements();
}

function useItemById(itemId) {
  const item = itemData[itemId];
  const count = getItemCount(itemId);

  if (!item) {
    return;
  }

  if (count <= 0) {
    addLog(`${item.name} はもう残っていない。`);
    render();
    return;
  }

  if (gameState.inBattle && !processTurnStartAilments(gameState.player, "ハルト")) {
    processTurnEndAilments(gameState.player, "ハルト");
    if (gameState.player.hp <= 0) {
      handlePlayerDefeat("ハルトは継続ダメージで倒れたが、テキスト世界が一行巻き戻る。");
      render();
      return;
    }
    render();
    enemyTurn();
    return;
  }

  gameState.player.inventory[itemId] -= 1;
  gameState.stats.itemsUsed += 1;
  gameState.runStats.itemsUsed += 1;
  addLog(`${item.name} を使用した。`, "system");
  addLog(item.use(gameState), "heal");
  checkAchievements();
  gameState.itemMenuOpen = false;
  gameState.itemListOpen = false;

  if (gameState.inBattle) {
    processTurnEndAilments(gameState.player, "ハルト");
    if (gameState.player.hp <= 0) {
      handlePlayerDefeat("ハルトは継続ダメージで倒れたが、テキスト世界が一行巻き戻る。");
      render();
      return;
    }
  }

  render();

  if (gameState.inBattle && !gameState.gameOver) {
    enemyTurn();
  }
}

function rollEnemyDrop(enemy) {
  if (!enemy.dropTable) {
    return;
  }

  for (const drop of enemy.dropTable) {
    if (Math.random() < drop.chance) {
      addItem(drop.itemId, 1);
      addLog(`${enemy.name} の残した文字列から ${itemData[drop.itemId].name} が1個再構成された。`, "system");
      return;
    }
  }
}

function completeArea(area) {
  if (!area.completionMessage) {
    return;
  }
  if (area.id === "endless") {
    return;
  }

  if (!gameState.clearedAreaIds.includes(area.id)) {
    gameState.clearedAreaIds.push(area.id);
  }
  gameState.areaCleared = true;
  addLog(area.completionMessage, "boss");
}

function advanceToNextFloor(area) {
  if (!isEndlessMode() && gameState.currentFloor >= areaData.creator.floors.end) {
    return;
  }

  gameState.currentFloor += 1;
  if (isEndlessMode() && gameState.currentFloor > gameState.endlessBestFloor) {
    gameState.endlessBestFloor = gameState.currentFloor;
  }
  const nextArea = getCurrentArea();
  addLog(fillTemplate(area.explorationTexts.advance, { floor: gameState.currentFloor, area: nextArea.name }), "system");

  if (nextArea.id !== area.id) {
    addLog(`${nextArea.name} に到達した。景色は新しい文体へと書き換わっていく。`, "system");
  }
  checkAchievements();
}
function endBattle(victory) {
  const enemy = gameState.currentEnemy;
  const area = getCurrentArea();
  const expectedBossId = getBossIdForFloor(area, gameState.currentFloor);
  const isBossBattle = Boolean(enemy?.isBoss && expectedBossId && enemy.id === expectedBossId);
  if (enemy?.id === "mojiru" || gameState.visualEffects.mojiruRewriteActive) {
    applyMojiruVisualRewrite(false);
  }

  if (victory && enemy) {
    addLog(enemy.defeatText, enemy.isBoss ? "boss" : "system");
    gameState.stats.totalKills += 1;
    if (gameState.player.hp === 1) {
      gameState.stats.hp1VictoryCount += 1;
    }
    if (enemy.isBoss) {
      gameState.stats.totalBossKills += 1;
      if (!gameState.stats.defeatedBossFloors.includes(gameState.currentFloor)) {
        gameState.stats.defeatedBossFloors.push(gameState.currentFloor);
      }
      if ((gameState.battleContext?.playerDamageTaken || 0) <= 0) {
        gameState.stats.noDamageBossWins += 1;
      }
      const recommendedLevel = recommendedBossLevelByFloor[gameState.currentFloor];
      if (recommendedLevel && gameState.player.level < recommendedLevel) {
        gameState.stats.underLevelBossWins += 1;
        if (gameState.currentFloor >= 90) {
          setStoryFlag("defeatedBossUnderCondition", true);
        }
      }
    }
    gainXp(enemy.xp);
    rollEnemyDrop(enemy);
    if (enemy.isBoss && enemy.spReward > 0) {
      gameState.player.sp += enemy.spReward;
      addLog(`大ボス撃破報酬として SP +${enemy.spReward} を獲得した！`, "boss");
      showBattleBanner("BOSS DEFEATED", "boss", 1100);
    }

    if (enemy.id === "mojiru" && !isEndlessMode() && gameState.currentFloor === 100) {
      completeArea(area);
      handleGameClear();
    } else if (isBossBattle) {
      if (!(isEndlessMode() && enemy.id === "mojiru" && gameState.currentFloor === 100)) {
        completeArea(area);
      }
      advanceToNextFloor(area);
    } else {
      if (gameState.holdFloorMode) {
        addLog(`待機モード中のため ${gameState.currentFloor}階 に留まる。`, "system");
      } else {
        advanceToNextFloor(area);
      }
    }
  }

  gameState.currentEnemy = null;
  gameState.inBattle = false;
  gameState.battleContext = null;
  gameState.player.guardCharges = 0;
  resetBattleUi();
  checkAchievements();
  render();
}

function playerAttack() {
  if (!gameState.inBattle || !gameState.currentEnemy) {
    return;
  }

  if (!processTurnStartAilments(gameState.player, "ハルト")) {
    processTurnEndAilments(gameState.player, "ハルト");
    if (gameState.player.hp <= 0) {
      handlePlayerDefeat("ハルトは継続ダメージで倒れたが、テキスト世界が一行巻き戻る。");
      render();
      return;
    }
    render();
    enemyTurn();
    return;
  }

  const enemy = gameState.currentEnemy;
  const result = dealDamageToEnemy(enemy, randomInt(2, 4) + getPlayerDamageBonus(gameState.player, "physical", enemy), {
    pierceRate: gameState.player.defensePenetration || 0,
    accuracyBonus: (gameState.player.accuracyBonus || 0) + getPlayerAccuracyPenalty(gameState.player),
    damageKind: "physical",
    fromSkill: false
  });
  if (!result.hit) {
    addLog(`ハルトの攻撃。だが、${enemy.name} は素早く身をかわした。`);
  } else if (enemy.defense > 0) {
    triggerDamageVisuals(result.damage, {
      target: "enemy",
      threshold: Math.max(8, Math.floor(enemy.maxHp * 0.12)),
      strong: result.damage >= Math.max(10, Math.floor(enemy.maxHp * 0.2)),
      extreme: enemy.isBoss && result.damage >= Math.max(14, Math.floor(enemy.maxHp * 0.24))
    });
    addLog(`ハルトの攻撃。${enemy.name}に ${result.damage} ダメージ。硬い外殻が衝撃を鈍らせた。`, "damage");
  } else {
    triggerDamageVisuals(result.damage, {
      target: "enemy",
      threshold: Math.max(8, Math.floor(enemy.maxHp * 0.12)),
      strong: result.damage >= Math.max(10, Math.floor(enemy.maxHp * 0.2)),
      extreme: enemy.isBoss && result.damage >= Math.max(14, Math.floor(enemy.maxHp * 0.24))
    });
    addLog(`ハルトの攻撃。${enemy.name}に ${result.damage} ダメージ。`, "damage");
  }

  if (result.hit && result.damage > 0 && gameState.player.lifeStealRate > 0) {
    const absorbed = recoverResource(gameState.player, "hp", "maxHp", Math.max(1, Math.floor(result.damage * gameState.player.lifeStealRate)));
    if (absorbed > 0) {
      addLog(`吸収攻撃が発動し、HPが ${absorbed} 回復した。`, "system");
    }
  }

  processTurnEndAilments(gameState.player, "ハルト");

  if (gameState.player.hp <= 0) {
    handlePlayerDefeat("ハルトは継続ダメージで倒れたが、テキスト世界が一行巻き戻る。");
    render();
    return;
  }

  if (enemy.hp <= 0) {
    endBattle(true);
    return;
  }

  render();
  enemyTurn();
}

function enemyTurn() {
  if (!gameState.inBattle || !gameState.currentEnemy) {
    return;
  }

  const player = gameState.player;
  const enemy = gameState.currentEnemy;
  if (enemy.isBoss && gameState.currentFloor >= 90 && Math.random() < 0.28) {
    addCorruptedLog("記録層にノイズが混入した。", { strength: 0.25 });
  }
  if (!processTurnStartAilments(enemy, enemy.name)) {
    processTurnEndAilments(enemy, enemy.name);
    if (enemy.hp <= 0) {
      endBattle(true);
      return;
    }
    render();
    return;
  }

  const bossTurnResult = runBossTurnStart(enemy, player);
  if (bossTurnResult.consumed) {
    processTurnEndAilments(enemy, enemy.name);
    if (enemy.hp <= 0) {
      endBattle(true);
      return;
    }
    if (player.hp <= 0) {
      handlePlayerDefeat("ハルトは力尽きたが、テキスト世界が一行巻き戻る。");
    }
    render();
    return;
  }

  const availableSkills = enemy.skillIds
    .map((skillId) => enemySkillData[skillId])
    .filter(Boolean);

  if (availableSkills.length > 0) {
    const chosenSkill = availableSkills.find((skill) => Math.random() < (skill.chance ?? 0));
    if (chosenSkill) {
      chosenSkill.use(gameState, enemy, player);
    } else {
      executeEnemyAttack(enemy, player, {
        min: enemy.attackMin,
        max: enemy.attackMax,
        hitsMin: enemy.attackHitsMin,
        hitsMax: enemy.attackHitsMax,
        isMagicLike: Boolean(enemy.traits?.magicLike)
      });
    }
  } else {
    executeEnemyAttack(enemy, player, {
      min: enemy.attackMin,
      max: enemy.attackMax,
      hitsMin: enemy.attackHitsMin,
      hitsMax: enemy.attackHitsMax,
      isMagicLike: Boolean(enemy.traits?.magicLike)
    });
  }

  runBossAfterEnemyAction(enemy, player);

  processTurnEndAilments(enemy, enemy.name);

  if (enemy.hp <= 0) {
    endBattle(true);
    return;
  }

  if (player.hp <= 0) {
    handlePlayerDefeat("ハルトは力尽きたが、テキスト世界が一行巻き戻る。");
  }

  render();
}

function toggleLogStatusView() {
  if (gameState.inBattle || gameState.gameOver) {
    return;
  }

  gameState.logViewMode = gameState.logViewMode === "log" ? "status" : "log";
  render();
}

function useSkill() {
  if (gameState.pendingEventChoice && !gameState.inBattle) {
    resolvePendingChoiceByControl("skill");
    return;
  }

  if (!gameState.inBattle) {
    gameState.skillListOpen = !gameState.skillListOpen;
    gameState.itemListOpen = false;
    gameState.skillMenuOpen = false;
    gameState.itemMenuOpen = false;
    render();
    return;
  }

  if (hasAilment(gameState.player, "skillSeal")) {
    addLog("記述改変の影響で、今はスキルを展開できない。", "danger");
    render();
    return;
  }

  gameState.skillMenuOpen = !gameState.skillMenuOpen;
  gameState.itemMenuOpen = false;
  gameState.skillListOpen = gameState.skillMenuOpen;
  gameState.itemListOpen = false;
  render();
}

function useItem() {
  if (gameState.pendingEventChoice && !gameState.inBattle) {
    resolvePendingChoiceByControl("item");
    return;
  }

  if (gameState.gameOver) {
    return;
  }

  gameState.itemMenuOpen = !gameState.itemMenuOpen;
  gameState.skillMenuOpen = false;
  gameState.itemListOpen = gameState.itemMenuOpen;
  gameState.skillListOpen = false;

  if (gameState.itemMenuOpen && Object.values(itemData).every((item) => getItemCount(item.id) <= 0)) {
    addLog("使えない時はメッセージだけが表示される。今は消費できるアイテムがない。");
  }

  render();
}

function learnSkill(skillId) {
  const skill = skillData[skillId];

  if (!skill || hasSkill(skillId) || gameState.player.sp < skill.costSP) {
    return;
  }

  gameState.player.sp -= skill.costSP;
  gameState.player.learnedSkillIds.push(skillId);
  addLog(`${skill.name} を習得した。`, "system");

  if (skill.type === "passive" && typeof skill.onLearn === "function") {
    addLog(skill.onLearn(gameState), "system");
  }

  checkAchievements();
  render();
}

function useLearnedSkill(skillId) {
  const skill = skillData[skillId];

  if (!gameState.inBattle || !skill || skill.type !== "active" || !hasSkill(skillId)) {
    return;
  }

  if (!processTurnStartAilments(gameState.player, "ハルト")) {
    processTurnEndAilments(gameState.player, "ハルト");
    if (gameState.player.hp <= 0) {
      handlePlayerDefeat("ハルトは継続ダメージで倒れたが、テキスト世界が一行巻き戻る。");
      render();
      return;
    }
    render();
    enemyTurn();
    return;
  }

  if (hasAilment(gameState.player, "skillSeal")) {
    addLog("スキル情報が乱れている……！ 改変が解けるまで発動できない。", "danger");
    render();
    return;
  }

  const requiredMp = getSkillMpCost(skill);
  if (gameState.player.mp < requiredMp) {
    addLog(`${skill.name} を使うにはMPが足りない。`);
    render();
    return;
  }

  gameState.player.mp -= requiredMp;
  addLog(`${skill.name} を発動。`, "system");
  addLog(skill.use(gameState), skill.logType || "system");
  resetBattleUi();

  processTurnEndAilments(gameState.player, "ハルト");
  if (gameState.player.hp <= 0) {
    handlePlayerDefeat("ハルトは継続ダメージで倒れたが、テキスト世界が一行巻き戻る。");
    render();
    return;
  }

  if (gameState.currentEnemy.hp <= 0) {
    endBattle(true);
    return;
  }

  render();
  enemyTurn();
}

function chooseRecoveryText(texts, fallbackText, amount) {
  if (amount <= 0 || texts.length === 0) {
    return fallbackText;
  }

  const template = texts[randomInt(0, texts.length - 1)];
  return fillTemplate(template, { amount });
}

function renderEventChoicePanel() {
  ui.eventChoicePanel.classList.remove("is-collapsed");
  ui.eventChoicePanel.classList.add("is-collapsed");
  ui.eventChoiceText.textContent = "";
  ui.eventChoiceButtons.innerHTML = "";
}

function getPendingChoiceContext() {
  const pending = gameState.pendingEventChoice;
  if (!pending) {
    return null;
  }
  const event = explorationEventData.find((item) => item.id === pending.eventId);
  if (!event || !Array.isArray(event.choices) || event.choices.length === 0) {
    return null;
  }
  return { pending, event, choices: event.choices };
}

function applyChoiceButtonLabels(pendingChoice) {
  if (!pendingChoice) {
    ui.advanceButton.textContent = "進む";
    if (textEffectTimer === null) {
      ui.attackButton.textContent = defaultLabelMap.attack;
      ui.skillButton.textContent = defaultLabelMap.skill;
      ui.itemButton.textContent = defaultLabelMap.item;
    }
    return;
  }
  ui.advanceButton.textContent = pendingChoice.choices[0]?.label || "進む";
  ui.skillButton.textContent = pendingChoice.choices[1]?.label || "スキル";
  ui.itemButton.textContent = pendingChoice.choices[2]?.label || "アイテム";
}

function getExplorationBattleChance() {
  if (gameState.difficulty === "hard") {
    return 0.68;
  }
  if (gameState.difficulty === "endless") {
    return 0.64;
  }
  return 0.62;
}

function getWeightedRandom(items) {
  if (!items || items.length === 0) {
    return null;
  }
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
  if (total <= 0) {
    return items[randomInt(0, items.length - 1)];
  }
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, Number(item.weight) || 0);
    if (roll <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function isExplorationEventEligible(event, area) {
  if (event.areaIds && !event.areaIds.includes(area.id)) {
    return false;
  }
  if (typeof event.minFloor === "number" && gameState.currentFloor < event.minFloor) {
    return false;
  }
  if (typeof event.maxFloor === "number" && gameState.currentFloor > event.maxFloor) {
    return false;
  }
  if (event.condition?.flagRequired && !gameState.storyFlags[event.condition.flagRequired]) {
    return false;
  }
  if (event.condition?.flagAbsent && gameState.storyFlags[event.condition.flagAbsent]) {
    return false;
  }
  if (typeof event.condition?.cycleMin === "number" && gameState.cycleCount < event.condition.cycleMin) {
    return false;
  }
  if (typeof event.condition?.clearCountMin === "number" && gameState.clearCount < event.condition.clearCountMin) {
    return false;
  }
  if (Array.isArray(event.condition?.difficultyIn) && !event.condition.difficultyIn.includes(gameState.difficulty)) {
    return false;
  }
  if (typeof event.condition?.trueFlagCountAtLeast === "number" && countUnlockedTrueFlags() < event.condition.trueFlagCountAtLeast) {
    return false;
  }
  return true;
}

function createEventEffectResult(triggeredBattle = false, skipAdvance = false) {
  return { triggeredBattle, skipAdvance };
}

// Exploration event effects use a dispatcher map instead of large switch branches.
const eventEffectHandlers = {
  none() {
    return createEventEffectResult(false, false);
  },
  hpHeal(effect) {
    const amount = randomInt(effect.min ?? 2, effect.max ?? 5);
    const healed = recoverResource(gameState.player, "hp", "maxHp", amount);
    addLog(healed > 0 ? `HPが ${healed} 回復した。` : "HPはすでに最大だった。", "event");
    return createEventEffectResult(false, false);
  },
  mpHeal(effect) {
    const amount = randomInt(effect.min ?? 2, effect.max ?? 5);
    const restored = recoverResource(gameState.player, "mp", "maxMp", amount);
    addLog(restored > 0 ? `MPが ${restored} 回復した。` : "MPはすでに最大だった。", "event");
    return createEventEffectResult(false, false);
  },
  hpDamage(effect) {
    const amount = randomInt(effect.min ?? 2, effect.max ?? 5);
    gameState.player.hp = Math.max(1, gameState.player.hp - amount);
    addLog(`HPが ${amount} 減少した。`, "event");
    return createEventEffectResult(false, false);
  },
  mpDamage(effect) {
    const amount = randomInt(effect.min ?? 2, effect.max ?? 5);
    gameState.player.mp = Math.max(0, gameState.player.mp - amount);
    addLog(`MPが ${amount} 減少した。`, "event");
    return createEventEffectResult(false, false);
  },
  gainItem(effect) {
    const amount = effect.amount ?? 1;
    addItem(effect.itemId, amount);
    addLog(`${itemData[effect.itemId]?.name || "アイテム"} を ${amount} 個獲得した。`, "event");
    return createEventEffectResult(false, false);
  },
  triggerBattle(effect, area) {
    const chance = typeof effect.chance === "number" ? effect.chance : 1;
    if (Math.random() > chance) {
      addLog("だが、何も起こらなかった。", "event");
      return createEventEffectResult(false, false);
    }
    const enemyId = effect.enemyId || area.enemies[randomInt(0, area.enemies.length - 1)];
    startBattle(enemyId);
    return createEventEffectResult(true, true);
  },
  addFlag(effect) {
    if (effect.flag) {
      const changed = setStoryFlag(effect.flag, true);
      if (!hiddenStoryFlagSet.has(effect.flag)) {
        addLog(`記録フラグ「${effect.flag}」を取得した。`, "event");
      } else if (changed) {
        addRewrittenLog(`見えないフラグを観測: ${effect.flag}`, "観測対象は再定義された。", 900, "rewrite");
      }
    }
    return createEventEffectResult(false, false);
  },
  removeFlag(effect) {
    if (effect.flag) {
      setStoryFlag(effect.flag, false, { silent: true });
      addLog(`記録フラグ「${effect.flag}」が解除された。`, "event");
    }
    return createEventEffectResult(false, false);
  },
  giveSp(effect) {
    const amount = randomInt(effect.min ?? 1, effect.max ?? 2);
    gameState.player.sp += amount;
    addLog(`SPを ${amount} 獲得した。`, "event");
    return createEventEffectResult(false, false);
  },
  giveXp(effect) {
    const amount = randomInt(effect.min ?? 8, effect.max ?? 22);
    gainXp(amount);
    return createEventEffectResult(false, false);
  },
  addStatus(effect) {
    tryApplyAilment(gameState.player, effect.statusId, "イベント", effect.chance ?? 1);
    return createEventEffectResult(false, false);
  },
  randomResult(effect, area) {
    const picked = getWeightedRandom(effect.results || []);
    if (!picked) {
      return createEventEffectResult(false, false);
    }
    if (picked.resultText) {
      addLog(picked.resultText, "event");
    }
    return applyEventEffect(picked.effect, area);
  }
};

function applyEventEffect(effect, area) {
  if (!effect || !effect.type) {
    return createEventEffectResult(false, false);
  }
  const handler = eventEffectHandlers[effect.type];
  if (!handler) {
    return createEventEffectResult(false, false);
  }
  return handler(effect, area);
}

function runDataDrivenEvent(area, event) {
  addLog(event.text, "event");
  if (event.type === "choice" && Array.isArray(event.choices) && event.choices.length > 0) {
    gameState.pendingEventChoice = {
      eventId: event.id,
      floor: gameState.currentFloor
    };
    const choiceGuideText = [
      event.choices[0] ? `進む: ${event.choices[0].label}` : null,
      event.choices[1] ? `スキル: ${event.choices[1].label}` : null,
      event.choices[2] ? `アイテム: ${event.choices[2].label}` : null
    ].filter(Boolean).join(" / ");
    if (choiceGuideText) {
      addLog(`選択肢 > ${choiceGuideText}`, "event");
    }
    render();
    return;
  }
  const effectResult = applyEventEffect(event.effect, area);
  if (!effectResult.triggeredBattle) {
    advanceToNextFloor(area);
    render();
  }
}

function resolveEventChoice(choiceIndex) {
  const context = getPendingChoiceContext();
  if (!context) {
    gameState.pendingEventChoice = null;
    render();
    return;
  }
  const { pending, event, choices } = context;
  const area = getAreaByFloor(pending.floor);
  if (!choices[choiceIndex]) {
    gameState.pendingEventChoice = null;
    render();
    return;
  }

  const choice = event.choices[choiceIndex];
  addLog(`選択: ${choice.label}`, "event");
  if (choice.resultText) {
    addLog(choice.resultText, "event");
  }
  const result = applyEventEffect(choice.effect, area);
  gameState.pendingEventChoice = null;
  if (!result.triggeredBattle && gameState.currentFloor === pending.floor) {
    advanceToNextFloor(area);
  }
  render();
}

function resolvePendingChoiceByControl(control) {
  const context = getPendingChoiceContext();
  if (!context) {
    return false;
  }
  const indexMap = {
    advance: 0,
    skill: 1,
    item: 2
  };
  const choiceIndex = indexMap[control];
  if (typeof choiceIndex !== "number" || !context.choices[choiceIndex]) {
    addLog("その操作には選択肢が割り当てられていない。", "event");
    render();
    return true;
  }
  resolveEventChoice(choiceIndex);
  return true;
}

function runQuietEvent(area) {
  const texts = area.explorationTexts.quiet;
  addLog(texts[randomInt(0, texts.length - 1)]);
  advanceToNextFloor(area);
  render();
}

function runRecoveryEvent(area) {
  const recoverHpMode = Math.random() < 0.5;

  if (recoverHpMode) {
    const healed = recoverResource(gameState.player, "hp", "maxHp", randomInt(2, 4));
    addLog(chooseRecoveryText(area.explorationTexts.hpRecovery, area.explorationTexts.hpRecoveryNoEffect, healed));
  } else {
    const restored = recoverResource(gameState.player, "mp", "maxMp", randomInt(2, 4));
    addLog(chooseRecoveryText(area.explorationTexts.mpRecovery, area.explorationTexts.mpRecoveryNoEffect, restored));
  }

  advanceToNextFloor(area);
  render();
}

function runItemFindEvent(area) {
  const foundItemId = Math.random() < 0.55 ? "potion" : "manaPotion";
  addItem(foundItemId, 1);
  addLog(area.explorationTexts.itemFind[foundItemId] || `${itemData[foundItemId].name} を見つけた。`, "system");
  advanceToNextFloor(area);
  render();
}

function runExplorationEvent(area) {
  if (gameState.pendingEventChoice) {
    addLog("先に表示されている選択肢を決める必要がある。", "event");
    render();
    return;
  }

  const battleChance = getExplorationBattleChance();
  if (Math.random() < battleChance && area.enemies.length > 0) {
    const enemyId = area.enemies[randomInt(0, area.enemies.length - 1)];
    startBattle(enemyId);
    return;
  }
  const candidates = explorationEventData.filter((event) => isExplorationEventEligible(event, area));
  const picked = getWeightedRandom(candidates);
  if (!picked) {
    runQuietEvent(area);
    return;
  }
  runDataDrivenEvent(area, picked);
}

function waitOnFloor() {
  if (gameState.pendingEventChoice) {
    addLog("先にイベントの選択肢を決める必要がある。", "event");
    render();
    return;
  }
  if (gameState.gameOver || gameState.areaCleared) {
    return;
  }

  const area = getCurrentArea();
  if (isBossFloor(area)) {
    addLog("この階層は大ボス部屋だ。待機しても逃れられない。", "boss");
    render();
    return;
  }

  if (gameState.inBattle) {
    if (!gameState.currentEnemy || gameState.currentEnemy.isBoss) {
      addLog("大ボス戦では待機設定を変更できない。", "boss");
      render();
      return;
    }
    gameState.holdFloorMode = true;
    addLog(`待機モードを設定した。この戦闘に勝利しても ${gameState.currentFloor}階 に留まる。`, "system");
    render();
    return;
  }

  gameState.holdFloorMode = true;
  const quietTexts = area.explorationTexts?.quiet || [];
  if (quietTexts.length > 0) {
    addLog(quietTexts[randomInt(0, quietTexts.length - 1)], "system");
  } else {
    addLog(`${area.name}で気配を殺し、同じ階層で様子を見た。`, "system");
  }
  addLog(`${gameState.currentFloor}階 で待機モードに入った。敵を倒しても階層は進まない。`, "system");
  triggerTextWorldEffectByScene();
  render();
}

function advanceFloor() {
  if (gameState.pendingEventChoice) {
    resolvePendingChoiceByControl("advance");
    return;
  }
  if (gameState.inBattle || gameState.gameOver || gameState.areaCleared) {
    return;
  }

  const area = getCurrentArea();
  if (gameState.holdFloorMode) {
    gameState.holdFloorMode = false;
    addLog("待機モードを解除し、先へ進む。", "system");
  }
  const rewriteInfo = areaTermOverwriteMap[area.id];
  addLog(area.ambientLogs[randomInt(0, area.ambientLogs.length - 1)]);
  if (rewriteInfo && Math.random() < 0.18) {
    addLog(`用語上書き: 「${rewriteInfo.from}」→「${rewriteInfo.to}」`, "rewrite");
  }
  triggerTextWorldEffectByScene();
  resetBattleUi();

  if (isBossFloor(area)) {
    const bossId = getBossIdForFloor(area, gameState.currentFloor);
    if (isImplementedArea(area)) {
      if (bossId) {
        startBattle(bossId);
      } else {
        addLog("この階層は異常な静寂に包まれている。", "system");
        runExplorationEvent(area);
      }
    } else {
      addLog(`${area.name} はまだ仮データのみだ。次の実装で本編が追加される。`, "system");
      render();
    }
    return;
  }

  runExplorationEvent(area);
}

// Save serialization helpers keep save payload structure explicit and reusable.
function serializeStatsForSave() {
  return {
    totalKills: gameState.stats.totalKills,
    totalBossKills: gameState.stats.totalBossKills,
    hp1VictoryCount: gameState.stats.hp1VictoryCount,
    noDamageBossWins: gameState.stats.noDamageBossWins,
    underLevelBossWins: gameState.stats.underLevelBossWins,
    itemsUsed: gameState.stats.itemsUsed,
    itemsGained: gameState.stats.itemsGained,
    defeatedBossFloors: [...gameState.stats.defeatedBossFloors],
    clearsByDifficulty: { ...gameState.stats.clearsByDifficulty }
  };
}

function serializePlayerForSave() {
  return {
    name: gameState.player.name,
    level: gameState.player.level,
    xp: gameState.player.xp,
    nextXp: gameState.player.nextXp,
    hp: gameState.player.hp,
    maxHp: gameState.player.maxHp,
    mp: gameState.player.mp,
    maxMp: gameState.player.maxMp,
    sp: gameState.player.sp,
    skills: [...gameState.player.skills],
    learnedSkillIds: [...gameState.player.learnedSkillIds],
    defensePenetration: gameState.player.defensePenetration,
    statusResistance: gameState.player.statusResistance,
    accuracyBonus: gameState.player.accuracyBonus,
    evasionBonus: gameState.player.evasionBonus,
    physicalPower: gameState.player.physicalPower,
    magicPower: gameState.player.magicPower,
    healingPower: gameState.player.healingPower,
    mpCostRate: gameState.player.mpCostRate,
    hpRegen: gameState.player.hpRegen,
    damageReduction: gameState.player.damageReduction,
    lifeStealRate: gameState.player.lifeStealRate,
    weaknessExploit: gameState.player.weaknessExploit,
    deathResist: gameState.player.deathResist,
    statusAilments: gameState.player.statusAilments.map((ailment) => ({ ...ailment })),
    inventory: { ...gameState.player.inventory }
  };
}

function serializeUiStateForSave() {
  return {
    logViewMode: gameState.logViewMode,
    selectedSkillTier: gameState.selectedSkillTier,
    skillTierPageIndex: gameState.skillTierPageIndex,
    skillTierTabsOpen: gameState.skillTierTabsOpen,
    skillListOpen: gameState.skillListOpen,
    itemListOpen: gameState.itemListOpen
  };
}

function serializeSaveData() {
  return {
    version: 1,
    difficulty: gameState.difficulty,
    endlessBestFloor: gameState.endlessBestFloor,
    currentFloor: gameState.currentFloor,
    areaId: gameState.areaId,
    areaCleared: gameState.areaCleared,
    clearCount: gameState.clearCount,
    cycleCount: gameState.cycleCount,
    trueEndCleared: gameState.trueEndCleared,
    lastEndingType: gameState.lastEndingType,
    lastEndingText: gameState.lastEndingText,
    gameCompleted: gameState.gameCompleted,
    holdFloorMode: gameState.holdFloorMode,
    unlockedAchievementIds: [...gameState.unlockedAchievementIds],
    storyFlags: { ...gameState.storyFlags },
    stats: serializeStatsForSave(),
    runStats: {
      itemsUsed: gameState.runStats.itemsUsed
    },
    clearedAreaIds: [...gameState.clearedAreaIds],
    ...serializeUiStateForSave(),
    player: serializePlayerForSave(),
    logHistory: gameState.logHistory.slice(-SAVED_LOG_ENTRIES)
  };
}

function sanitizeInventory(value) {
  const inventory = {};
  Object.keys(itemData).forEach((itemId) => {
    const rawCount = Number(value?.[itemId]);
    inventory[itemId] = Number.isFinite(rawCount) && rawCount >= 0 ? Math.floor(rawCount) : 0;
  });
  return inventory;
}

function sanitizeLearnedSkillIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((skillId) => typeof skillId === "string" && skillData[skillId]);
}
function sanitizeLogHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => isPlainObject(entry) && typeof entry.message === "string")
    .map((entry) => ({
      id: ++logEntryCounter,
      message: entry.message,
      type: typeof entry.type === "string" ? entry.type : ""
    }))
    .slice(-SAVED_LOG_ENTRIES);
}

function applyParsedPlayerState(state, parsedPlayer) {
  state.player.name = typeof parsedPlayer.name === "string" ? parsedPlayer.name : state.player.name;
  state.player.level = Math.max(1, Math.floor(Number(parsedPlayer.level) || state.player.level));
  state.player.xp = Math.max(0, Math.floor(Number(parsedPlayer.xp) || 0));
  {
    const baselineNextXp = calculateNextXp(state.player.level);
    const rawNextXp = Math.floor(Number(parsedPlayer.nextXp));
    if (!Number.isFinite(rawNextXp) || rawNextXp <= 0) {
      state.player.nextXp = baselineNextXp;
    } else if (rawNextXp > baselineNextXp * 4 || rawNextXp < Math.floor(baselineNextXp * 0.25)) {
      state.player.nextXp = baselineNextXp;
    } else {
      state.player.nextXp = rawNextXp;
    }
  }
  state.player.maxHp = Math.max(1, Math.floor(Number(parsedPlayer.maxHp) || state.player.maxHp));
  state.player.maxMp = Math.max(0, Math.floor(Number(parsedPlayer.maxMp) || state.player.maxMp));
  state.player.hp = Math.min(state.player.maxHp, Math.max(0, Math.floor(Number(parsedPlayer.hp) || 0)));
  state.player.mp = Math.min(state.player.maxMp, Math.max(0, Math.floor(Number(parsedPlayer.mp) || 0)));
  state.player.sp = Math.max(0, Math.floor(Number(parsedPlayer.sp) || 0));
  state.player.skills = Array.isArray(parsedPlayer.skills) && parsedPlayer.skills.length > 0
    ? parsedPlayer.skills.filter((skill) => typeof skill === "string")
    : state.player.skills;
  state.player.learnedSkillIds = sanitizeLearnedSkillIds(parsedPlayer.learnedSkillIds);
  state.player.defensePenetration = Math.max(0, Math.floor(Number(parsedPlayer.defensePenetration) || 0));
  state.player.statusResistance = Boolean(parsedPlayer.statusResistance);
  state.player.accuracyBonus = Math.max(0, Math.floor(Number(parsedPlayer.accuracyBonus) || 0));
  state.player.evasionBonus = Math.max(0, Math.floor(Number(parsedPlayer.evasionBonus) || 0));
  state.player.physicalPower = Math.max(0, Math.floor(Number(parsedPlayer.physicalPower) || 0));
  state.player.magicPower = Math.max(0, Math.floor(Number(parsedPlayer.magicPower) || 0));
  state.player.healingPower = Math.max(0, Math.floor(Number(parsedPlayer.healingPower) || 0));
  state.player.mpCostRate = Math.max(0.5, Math.min(1, Number(parsedPlayer.mpCostRate) || 1));
  state.player.hpRegen = Math.max(0, Math.floor(Number(parsedPlayer.hpRegen) || 0));
  state.player.damageReduction = Math.max(0, Math.floor(Number(parsedPlayer.damageReduction) || 0));
  state.player.lifeStealRate = Math.max(0, Number(parsedPlayer.lifeStealRate) || 0);
  state.player.weaknessExploit = Math.max(0, Math.floor(Number(parsedPlayer.weaknessExploit) || 0));
  state.player.deathResist = Boolean(parsedPlayer.deathResist);
  state.player.statusAilments = sanitizeStatusAilments(parsedPlayer.statusAilments);
  state.player.inventory = sanitizeInventory(parsedPlayer.inventory);
}

function applyParsedStatsState(state, parsedStats) {
  if (!isPlainObject(parsedStats)) {
    return;
  }
  state.stats.totalKills = Math.max(0, Math.floor(Number(parsedStats.totalKills) || 0));
  state.stats.totalBossKills = Math.max(0, Math.floor(Number(parsedStats.totalBossKills) || 0));
  state.stats.hp1VictoryCount = Math.max(0, Math.floor(Number(parsedStats.hp1VictoryCount) || 0));
  state.stats.noDamageBossWins = Math.max(0, Math.floor(Number(parsedStats.noDamageBossWins) || 0));
  state.stats.underLevelBossWins = Math.max(0, Math.floor(Number(parsedStats.underLevelBossWins) || 0));
  state.stats.itemsUsed = Math.max(0, Math.floor(Number(parsedStats.itemsUsed) || 0));
  state.stats.itemsGained = Math.max(0, Math.floor(Number(parsedStats.itemsGained) || 0));
  state.stats.defeatedBossFloors = Array.isArray(parsedStats.defeatedBossFloors)
    ? parsedStats.defeatedBossFloors
      .map((floor) => Math.floor(Number(floor)))
      .filter((floor) => Number.isFinite(floor) && floor >= 1 && floor <= 100)
    : [];
  if (isPlainObject(parsedStats.clearsByDifficulty)) {
    state.stats.clearsByDifficulty.normal = Math.max(0, Math.floor(Number(parsedStats.clearsByDifficulty.normal) || 0));
    state.stats.clearsByDifficulty.hard = Math.max(0, Math.floor(Number(parsedStats.clearsByDifficulty.hard) || 0));
    state.stats.clearsByDifficulty.endless = Math.max(0, Math.floor(Number(parsedStats.clearsByDifficulty.endless) || 0));
  }
}

function applyParsedUiState(state, parsed) {
  state.logViewMode = parsed.logViewMode === "status" ? "status" : "log";
  state.selectedSkillTier = getSkillTierValues().includes(Number(parsed.selectedSkillTier))
    ? Number(parsed.selectedSkillTier)
    : 5;
  state.skillTierPageIndex = Math.max(0, Math.floor(Number(parsed.skillTierPageIndex) || 0));
  state.skillTierTabsOpen = typeof parsed.skillTierTabsOpen === "boolean" ? parsed.skillTierTabsOpen : true;
  state.skillListOpen = typeof parsed.skillListOpen === "boolean" ? parsed.skillListOpen : false;
  state.itemListOpen = typeof parsed.itemListOpen === "boolean" ? parsed.itemListOpen : false;
}

function buildStateFromSave(parsed) {
  if (!isPlainObject(parsed) || !isPlainObject(parsed.player)) {
    throw new Error("invalid save payload");
  }

  const parsedDifficulty = typeof parsed.difficulty === "string" && difficultyConfig[parsed.difficulty]
    ? parsed.difficulty
    : "normal";
  const currentFloor = Number(parsed.currentFloor);
  const maxFloor = parsedDifficulty === "endless" ? 9999 : 100;
  if (!Number.isFinite(currentFloor) || currentFloor < 1 || currentFloor > maxFloor) {
    throw new Error("invalid floor");
  }

  const state = createInitialGameState();
  state.difficulty = parsedDifficulty;
  state.endlessBestFloor = Math.max(1, Math.floor(Number(parsed.endlessBestFloor) || state.endlessBestFloor));
  state.currentFloor = Math.floor(currentFloor);
  state.areaId = getAreaByFloor(state.currentFloor).id;
  applyParsedPlayerState(state, parsed.player);
  state.clearedAreaIds = Array.isArray(parsed.clearedAreaIds)
    ? parsed.clearedAreaIds.filter((areaId) => typeof areaId === "string" && areaData[areaId])
    : [];
  state.unlockedAchievementIds = Array.isArray(parsed.unlockedAchievementIds)
    ? parsed.unlockedAchievementIds.filter((id) => typeof id === "string")
    : [];
  state.storyFlags = isPlainObject(parsed.storyFlags)
    ? Object.fromEntries(Object.entries(parsed.storyFlags).map(([key, value]) => [String(key), Boolean(value)]))
    : {};
  applyParsedStatsState(state, parsed.stats);
  if (isPlainObject(parsed.runStats)) {
    state.runStats.itemsUsed = Math.max(0, Math.floor(Number(parsed.runStats.itemsUsed) || 0));
  }
  state.clearCount = Math.max(0, Math.floor(Number(parsed.clearCount) || 0));
  state.cycleCount = Math.max(0, Math.floor(Number(parsed.cycleCount) || 0));
  state.trueEndCleared = Boolean(parsed.trueEndCleared);
  state.lastEndingType = parsed.lastEndingType === "true" ? "true" : "normal";
  state.lastEndingText = typeof parsed.lastEndingText === "string" ? parsed.lastEndingText : "";
  state.gameCompleted = Boolean(parsed.gameCompleted);
  state.holdFloorMode = Boolean(parsed.holdFloorMode);
  applyParsedUiState(state, parsed);
  state.logHistory = sanitizeLogHistory(parsed.logHistory);
  state.areaCleared = state.clearedAreaIds.includes(state.areaId) || Boolean(parsed.areaCleared);
  if (state.difficulty === "endless") {
    state.endlessBestFloor = Math.max(state.endlessBestFloor, state.currentFloor);
  }
  return state;
}

function applyState(nextState) {
  Object.keys(gameState).forEach((key) => {
    delete gameState[key];
  });
  Object.assign(gameState, nextState);
  syncCurrentArea();
}

function persistGame({ silent = false, statusMessage = "セーブ完了" } = {}) {
  try {
    const payload = JSON.stringify(serializeSaveData());
    localStorage.setItem(SAVE_STORAGE_KEY, payload);
    setSaveStatus(statusMessage);
    if (!silent) {
      addLog("現在の進行状況を保存した。", "system");
      render();
    }
  } catch (error) {
    if (silent) {
      setSaveStatus("オートセーブ失敗");
      return;
    }
    setSaveStatus("セーブ失敗");
    addLog("保存に失敗した。ブラウザの保存領域を確認してほしい。", "danger");
    render();
  }
}

function scheduleAutoSave() {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
  }

  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    persistGame({ silent: true, statusMessage: "オートセーブ済み" });
  }, AUTOSAVE_DELAY_MS);
}

function saveGame() {
  persistGame();
}

function loadGame(options = {}) {
  const silent = Boolean(options.silent);
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      setSaveStatus("保存データなし");
      if (!silent) {
        addLog("ロードできる保存データが見つからない。", "danger");
      }
      render();
      return;
    }

    const parsed = JSON.parse(raw);
    const nextState = buildStateFromSave(parsed);
    applyState(nextState);
    applyMojiruVisualRewrite(false);
    hideEndingOverlay();
    hideAchievementOverlay();
    checkAchievements();
    setSaveStatus("ロード完了");
    if (!silent) {
      addLog("保存データを読み込み、進行状況を復元した。", "system");
    }
    render();
  } catch (error) {
    localStorage.removeItem(SAVE_STORAGE_KEY);
    applyState(createInitialGameState());
    initializeOpeningLogs();
    setSaveStatus("保存データ破損のため初期化");
    addLog("保存データが壊れていたため、安全に初期化した。", "danger");
    render();
  }
}

function resetGame() {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  localStorage.removeItem(SAVE_STORAGE_KEY);
  applyState(createInitialGameState());
  applyMojiruVisualRewrite(false);
  initializeOpeningLogs();
  hideEndingOverlay();
  hideAchievementOverlay();
  hideTitleOverlay();
  setSaveStatus("リセット完了");
  addLog("保存データを削除し、ゲームを初期状態に戻した。", "system");
  render();
}

function bindUiEvents() {
  ui.advanceButton.addEventListener("click", advanceFloor);
  ui.attackButton.addEventListener("click", playerAttack);
  ui.skillButton.addEventListener("click", useSkill);
  ui.itemButton.addEventListener("click", useItem);
  ui.escapeButton.addEventListener("click", toggleLogStatusView);
  ui.waitButton.addEventListener("click", waitOnFloor);
  ui.achievementButton.addEventListener("click", showAchievementOverlay);
  ui.closeAchievementButton.addEventListener("click", hideAchievementOverlay);
  ui.toggleSkillTierTabsButton.addEventListener("click", () => {
    gameState.skillTierTabsOpen = !gameState.skillTierTabsOpen;
    renderSkillList();
  });
  ui.saveButton.addEventListener("click", saveGame);
  ui.loadButton.addEventListener("click", loadGame);
  ui.resetButton.addEventListener("click", resetGame);
  ui.titleContinueButton.addEventListener("click", () => {
    hideTitleOverlay();
    render();
  });
  ui.titleNewRunButton.addEventListener("click", startFreshRunKeepRecords);
  ui.titleDifficultySelect.addEventListener("change", () => {
    if (ui.titleDifficultySelect.value === "endless") {
      ui.titleRecordText.textContent = "難易度: Endless / 100階以降も継続可能";
      return;
    }
    ui.titleRecordText.textContent = `難易度: ${ui.titleDifficultySelect.value === "hard" ? "Hard" : "Normal"} / 最初から挑戦で適用`;
  });
  ui.goTitleButton.addEventListener("click", () => {
    hideEndingOverlay();
    showTitleOverlay();
    render();
  });
  ui.newCycleButton.addEventListener("click", startNewCycle);
}

function initializeOpeningLogs() {
  const area = getCurrentArea();
  gameState.logHistory = [];
  addLog(`ハルトは文字だけで編まれた塔の${area.name}に降り立った。`);
  addLog("この世界では、木々も魔物も、すべてが文章として存在している。");
  addLog("まずは10階のオークを倒し、森エリアを突破しよう。", "system");
  if (gameState.clearCount > 0) {
    addLog(`周回記録: ${gameState.clearCount}回クリア。テキスト世界は前より僅かに優しく見える。`, "system");
  }
  if (countUnlockedTrueFlags() >= 3) {
    addLog("行間のどこかで、以前の周回を知る声が待っている。", "rewrite");
  }
  if (isTrueEndCleared()) {
    addLog("True End到達記録が保存されている。世界は以前とは少し違う顔をしている。", "event");
  }
  checkAchievements();
}

function getSelectedDifficultyFromTitle() {
  const selected = ui.titleDifficultySelect?.value;
  return difficultyConfig[selected] ? selected : "normal";
}

function startNewCycle() {
  const carryClearCount = gameState.clearCount;
  const nextCycleCount = gameState.cycleCount + 1;
  const carryDifficulty = gameState.difficulty;
  const carryEndlessBestFloor = gameState.endlessBestFloor;
  const carryStoryFlags = { ...gameState.storyFlags };
  const carryTrueEndCleared = gameState.trueEndCleared;
  const carryAchievementIds = [...gameState.unlockedAchievementIds];
  const carryStats = {
    totalKills: gameState.stats.totalKills,
    totalBossKills: gameState.stats.totalBossKills,
    hp1VictoryCount: gameState.stats.hp1VictoryCount,
    noDamageBossWins: gameState.stats.noDamageBossWins,
    underLevelBossWins: gameState.stats.underLevelBossWins,
    itemsUsed: gameState.stats.itemsUsed,
    itemsGained: gameState.stats.itemsGained,
    defeatedBossFloors: [...gameState.stats.defeatedBossFloors],
    clearsByDifficulty: { ...gameState.stats.clearsByDifficulty }
  };
  const nextState = createInitialGameState();
  nextState.difficulty = carryDifficulty;
  nextState.endlessBestFloor = carryEndlessBestFloor;
  nextState.clearCount = carryClearCount;
  nextState.cycleCount = nextCycleCount;
  nextState.unlockedAchievementIds = carryAchievementIds;
  nextState.stats = carryStats;
  nextState.storyFlags = carryStoryFlags;
  nextState.trueEndCleared = carryTrueEndCleared;
  nextState.player.sp += carryClearCount * 2;
  nextState.saveStatusMessage = "周回開始";
  applyState(nextState);
  applyMojiruVisualRewrite(false);
  initializeOpeningLogs();
  hideEndingOverlay();
  hideAchievementOverlay();
  hideTitleOverlay();
  addLog(`周回開始。クリア特典として SP +${carryClearCount * 2} を獲得した。`, "system");
  render();
}

function startFreshRunKeepRecords() {
  const carryClearCount = gameState.clearCount;
  const carryCycleCount = gameState.cycleCount;
  const carryEndlessBestFloor = gameState.endlessBestFloor;
  const carryStoryFlags = { ...gameState.storyFlags };
  const carryTrueEndCleared = gameState.trueEndCleared;
  const carryAchievementIds = [...gameState.unlockedAchievementIds];
  const carryStats = {
    totalKills: gameState.stats.totalKills,
    totalBossKills: gameState.stats.totalBossKills,
    hp1VictoryCount: gameState.stats.hp1VictoryCount,
    noDamageBossWins: gameState.stats.noDamageBossWins,
    underLevelBossWins: gameState.stats.underLevelBossWins,
    itemsUsed: gameState.stats.itemsUsed,
    itemsGained: gameState.stats.itemsGained,
    defeatedBossFloors: [...gameState.stats.defeatedBossFloors],
    clearsByDifficulty: { ...gameState.stats.clearsByDifficulty }
  };
  const nextState = createInitialGameState();
  nextState.difficulty = getSelectedDifficultyFromTitle();
  nextState.endlessBestFloor = carryEndlessBestFloor;
  nextState.clearCount = carryClearCount;
  nextState.cycleCount = carryCycleCount;
  nextState.unlockedAchievementIds = carryAchievementIds;
  nextState.stats = carryStats;
  nextState.storyFlags = carryStoryFlags;
  nextState.trueEndCleared = carryTrueEndCleared;
  nextState.endlessBestFloor = Math.max(nextState.endlessBestFloor, 1);
  nextState.saveStatusMessage = "新規開始";
  applyState(nextState);
  applyMojiruVisualRewrite(false);
  initializeOpeningLogs();
  hideEndingOverlay();
  hideAchievementOverlay();
  hideTitleOverlay();
  render();
}

function handleGameClear() {
  if (isEndlessMode()) {
    addLog("創造神を越えてなお塔は続く。Endlessモードでは物語が閉じない。", "boss");
    showBattleBanner("ENDLESS CONTINUE", "rewrite", 1300);
    return;
  }
  if (gameState.gameCompleted) {
    return;
  }

  gameState.gameCompleted = true;
  gameState.stats.clearsByDifficulty[gameState.difficulty] = (gameState.stats.clearsByDifficulty[gameState.difficulty] || 0) + 1;
  if (gameState.runStats.itemsUsed <= 0) {
    setStoryFlag("clearedWithoutUsingItem", true, { silent: true });
  }
  const trueEndCheck = getTrueEndEvaluation();
  gameState.lastEndingType = trueEndCheck.canTrigger ? "true" : "normal";
  if (gameState.lastEndingType === "true") {
    gameState.trueEndCleared = true;
    addLog("モジールの崩壊後、最終行の外側から別の語り手が現れた。", "boss");
    showBattleBanner("TRUE END ROUTE", "rewrite", 1400);
  }
  gameState.clearCount += 1;
  addLog("塔の最終章が閉じ、ハルトの物語はひとつの終着点に達した。", "boss");
  updateRecordUi();
  checkAchievements();
  showEndingOverlay();
}

function initializeGame() {
  bindUiEvents();
  applyMojiruVisualRewrite(false);
  hideEndingOverlay();
  hideAchievementOverlay();

  try {
    if (localStorage.getItem(SAVE_STORAGE_KEY)) {
      loadGame({ silent: true });
      showTitleOverlay();
      return;
    }

    initializeOpeningLogs();
    setSaveStatus("保存データなし");
  } catch (error) {
    initializeOpeningLogs();
    setSaveStatus("保存機能を利用できない環境");
  }

  showTitleOverlay();
  render();
}

initializeGame();
