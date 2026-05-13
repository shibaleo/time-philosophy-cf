export type Property = {
  id: string
  mark: string
  name: string
  reading: string
  essence: string
  description: string
  ksf: string[]
  motion?: 'flow' | 'shuffle' | 'jitter' | 'window'
  scene?:
    | 'stream-wall'
    | 'flow'
    | 'finite'
    | 'irreversible'
    | 'heterogeneous'
    | 'noncommutative'
    | 'nonadditive'
    | 'nonsubstitutable'
    | 'future'
    | 'uncertainty'
    | 'window'
  pictogram: string[]
}

export type Chapter = {
  id: string
  numeral: string
  title: string
  reading: string
  lead: string
  properties: Property[]
}

export const intro = {
  eyebrow: 'Eleven Properties of Time',
  title: '時間の特徴',
  lead: '時間は、独自の性質を持つ資産である。',
  body:
    'それぞれの性質は、扱い方を誤れば課題となり、\n理解すれば味方になる。\n11の性質を、3つの章に分けて、眺めていく。',
}

export const chapters: Chapter[] = [
  {
    id: 'constraints',
    numeral: 'I',
    title: '制約',
    reading: 'Constraints',
    lead: '時間には、誰の手にも届かない壁がある。',
    properties: [
      {
        id: 'finite',
        mark: '有',
        name: '有限性',
        reading: 'Finiteness',
        essence: '総量に、上限がある。',
        description:
          '人生全体でも、一日単位でも、時間は希少である。一生のうちに読める本、観られる映画、行ける場所、習得できる趣味の数には、限りがある。',
        ksf: ['優先度を付ける', 'やらないことを明確にする', '使う時間の合計に上限を定める'],
        scene: 'finite',
        pictogram: [
          '..............',
          '.████████████.',
          '.█..........█.',
          '.█.████████.█.',
          '.█.████████.█.',
          '.█.████████.█.',
          '.█..........█.',
          '.████████████.',
        ],
      },
      {
        id: 'noncarry',
        mark: '繰',
        name: '繰越不能性',
        reading: 'Non-carryover',
        essence: '余った時間は、未来へ持ち越せない。',
        description:
          '予定が早く終わっても、空いた時間は、その時に使うしかない。残しておくことはできない。',
        ksf: ['空き時間の活用', '空き時間の活用方針を決めておく'],
        scene: 'stream-wall',
        pictogram: [
          '..............',
          '████..........',
          '████..........',
          '████..........',
          '████....███...',
          '████....███...',
          '████....███...',
          '████....███...',
        ],
      },
      {
        id: 'flow',
        mark: '流',
        name: '常時流出性',
        reading: 'Constant Outflow',
        essence: '時間は、常に経過し、失われ続ける。',
        description:
          '止まっている間にも、時間は流れていく。経過を忘れたとき、迷いと、着手の遅れが現れる。',
        ksf: ['時間経過の可視化', '迷いの抑制', '着手遅延の抑制'],
        motion: 'flow',
        scene: 'flow',
        pictogram: [
          '██............',
          '.██...........',
          '..██..........',
          '...██.........',
          '....██........',
          '.....██.......',
          '......██......',
          '.......██.....',
        ],
      },
      {
        id: 'irreversible',
        mark: '不',
        name: '不可逆性',
        reading: 'Irreversibility',
        essence: '一度経過した時間は、返ってこない。',
        description:
          '使った時間は取り戻せない。だからこそ、過去を受け入れ、これからの時間の使い方を、自分で納得しておく必要がある。',
        ksf: ['過去の時間を受容する', '事前に納得した使い方をする', 'サンクコストを継続理由にしない'],
        scene: 'irreversible',
        pictogram: [
          '..............',
          '..............',
          '█.............',
          '██............',
          '████..........',
          '███████.......',
          '███████████...',
          '██████████████',
        ],
      },
    ],
  },
  {
    id: 'form',
    numeral: 'II',
    title: '形',
    reading: 'Form',
    lead: '同じ一時間でも、姿かたちが違う。',
    properties: [
      {
        id: 'heterogeneous',
        mark: '質',
        name: '非一様性',
        reading: 'Heterogeneity',
        essence: '時間の質は、一定ではない。',
        description:
          '時間帯、体調、環境、文脈によって、何に向くかが変化する。同じ一時間でも、すべて同じ価値ではない。',
        ksf: ['時間の質を見分ける', '用途適性のある時間に行動を配置する', '状況に応じて切り替える'],
        scene: 'heterogeneous',
        pictogram: [
          '█.█...████.█..',
          '.█....████....',
          '█.....████..█.',
          '.█.█..........',
          '......█.....█.',
          '█.█..█████....',
          '.█....███...█.',
          '█.█..█████.█..',
        ],
      },
      {
        id: 'noncommutative',
        mark: '順',
        name: '非可換性',
        reading: 'Non-commutativity',
        essence: '順序を変えれば、結果も変わる。',
        description:
          '同じ要素、同じ総量でも、並び順が違えば、進みやすさも、生まれる価値も、成立そのものも変わる。',
        ksf: ['行動の順序を予め決める', '決めた順序をむやみに崩さない'],
        motion: 'shuffle',
        scene: 'noncommutative',
        pictogram: [
          '█.............',
          '██............',
          '███...........',
          '████..........',
          '.........████.',
          '..........███.',
          '...........██.',
          '............█.',
        ],
      },
      {
        id: 'nonadditive',
        mark: '塊',
        name: '非加法性',
        reading: 'Non-additivity',
        essence: 'まとめて使うか、分けて使うかで、価値は変わる。',
        description:
          '同じ総量の時間でも、ひとまとまりで使うか、短く積み重ねるかで、得られるものが異なる。どちらが優れているとは、一概に言えない。',
        ksf: ['まとめと分割のどちらが適切か見抜く', '時間の連続性に応じて行動を決める'],
        scene: 'nonadditive',
        pictogram: [
          '..............',
          '.██████.......',
          '.██████.......',
          '.██████.......',
          '..............',
          '.█.█.█..██.██.',
          '.█.█.█..██.██.',
          '..............',
        ],
      },
    ],
  },
  {
    id: 'relations',
    numeral: 'III',
    title: '関係',
    reading: 'Relations',
    lead: '時間は、自分の外側ともつながっている。',
    properties: [
      {
        id: 'nonsubstitutable',
        mark: '己',
        name: '非代替性',
        reading: 'Non-substitutability',
        essence: 'その時間は、他の誰でも代わりにならない。',
        description:
          '自分の時間でしか得られないものがある。特定の人といる時間でしか得られないものもある。身体、認知、経験、関係、責任は、譲渡できない。',
        ksf: ['自分で経験するべきことを明確にする', '他人に任せられることを明確にする'],
        scene: 'nonsubstitutable',
        pictogram: [
          '█.█.█.█.█.█.█.',
          '.█.█.█.█.█.█.█',
          '█.█.███.█.█.█.',
          '.█.█.███.█.█.█',
          '█.█.███.█.█.█.',
          '.█.█.█.█.█.█.█',
          '█.█.█.█.█.█.█.',
          '.█.█.█.█.█.█.█',
        ],
      },
      {
        id: 'future',
        mark: '先',
        name: '未来影響性',
        reading: 'Future Impact',
        essence: '今の使い方が、未来の時間を決める。',
        description:
          '現在と未来には、因果関係がある。今の選び方が、これから使える時間の質と量を、静かに左右している。',
        ksf: ['後を悪くする要因を先に減らす', '後を良くする要因に先に時間を使う'],
        pictogram: [
          '█.............',
          '██............',
          '.██...........',
          '..██..........',
          '..███.........',
          '...████.......',
          '....███████...',
          '......████████',
        ],
      },
      {
        id: 'uncertain',
        mark: '揺',
        name: '不確実性',
        reading: 'Uncertainty',
        essence: '使える時間は、予定通りには来ない。',
        description:
          '体調不良、割り込み、移動の遅延、家族対応。幅、質、連続性、タイミング。あらゆる側面が、計画からずれていく。',
        ksf: ['別案を設けておく', '何が予定を崩すかを把握する'],
        motion: 'jitter',
        scene: 'uncertainty',
        pictogram: [
          '.█..█..█....█.',
          '...█....█..█..',
          '█....█......█.',
          '..█....█.█....',
          '█...█.....█...',
          '....█..█....█.',
          '.█....█.....█.',
          '...█.....█.█..',
        ],
      },
      {
        id: 'window',
        mark: '窓',
        name: '区間制約性',
        reading: 'Window Constraint',
        essence: '今しか成立しない時間が、ある。',
        description:
          '特定の区間内でしか成立しない行動や価値がある。「これ以降」「これ以前」「その間だけ」。朝の身支度も、締め切りも、子供といられる時間も、すべて区間に縛られている。',
        ksf: ['どの区間でのみ成立するかを明確にする', '成立する区間内で実行する'],
        motion: 'window',
        scene: 'window',
        pictogram: [
          '..............',
          '..............',
          '......██......',
          '......██......',
          '......██......',
          '......██......',
          '......██......',
          '......██......',
        ],
      },
    ],
  },
]

export const closing = {
  eyebrow: 'Coda',
  title: '性質を、味方にする。',
  body:
    '時間は、与えられて、流れていく。\nその性質を知ることは、生き方の精度を上げることに、静かにつながっている。',
}
