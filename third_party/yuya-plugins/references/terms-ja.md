# Writing technical terms in Japanese pages

Every Japanese page (explanations, slides, videos, quizzes, courses)
gives each term of art exactly one form, chosen by how Japanese engineers
actually write it. Two failure modes this prevents:

- A bare translation of a named concept reads like an ordinary word
  (「一定作業」 for constant work, 「波」 for a deployment wave), so the reader
  doesn't notice it is a concept they could look up.
- English or a gloss bolted onto established katakana (「フォールバック
  （fallback）」, 「データプレーン（data plane）」) only gets in the way.

## Pick one of three forms per term

| kind | when | how to write it |
|---|---|---|
| **K** katakana | the katakana is everyday engineering vocabulary | katakana alone, every time |
| **J** Japanese | an established Japanese rendering (vendor docs and common usage agree) | Japanese alone |
| **E+J** English + gloss | the only Japanese reads like an ordinary word, or there is no settled form | English with a short gloss of *what it is* on first mention (`constant work（負荷に関係なく常に同じ量の仕事をする設計）`), then the English alone |

How to decide:

1. Look the term up in the vendor's Japanese docs (AWS: `docs.aws.amazon.com/ja_jp/…`,
   `aws.amazon.com/jp/builders-library/…`; also the console's Japanese UI names).
2. Search Zenn, Qiita and Classmethod for the candidate forms and see which
   one working engineers use.
3. A vendor translation that is an ordinary word (AWS: 影響範囲 for blast
   radius, 一定の作業 for constant work, 負荷制限 for load shedding) is E+J,
   not J: the official word still hides the concept.
4. The gloss says what the thing is or does, not a literal translation.

In narrated videos the English of an E+J term is spoken in katakana through
`reading` / readings.json, and the caption shows the English. Board labels,
quiz questions, goals and summaries use the same form as the narration.

When several writers produce one piece (a course), the orchestrator decides
the forms up front in a term table and hands it to every writer.

## Seed glossary (cloud / SRE / resilience)

Decided for the AWS cell-based architecture course (2026-10) from AWS
Japanese docs and Zenn / Qiita / Classmethod usage. Reuse these forms; add
new terms with the same method.

| English | kind | form |
|---|---|---|
| fallback / failover / rollback | K | フォールバック / フェイルオーバー / ロールバック |
| control plane / data plane | K | コントロールプレーン / データプレーン |
| partition key / consistent hashing | K | パーティションキー / コンシステントハッシュ |
| shuffle sharding / recursive shuffle sharding | K | シャッフルシャーディング / 再帰的シャッフルシャーディング |
| cell / cell router / canary cell | K | セル / セルルーター / カナリアセル |
| headroom / token bucket / stateless | K | ヘッドルーム / トークンバケット / ステートレス |
| drain / zonal shift / zonal autoshift | K | ドレイン / ゾーンシフト / ゾーンオートシフト |
| Single-AZ / Multi-AZ | K | シングルAZ / マルチAZ |
| live migration | K | ライブマイグレーション |
| static stability | J | 静的安定性 |
| gray failure | J | グレー障害 |
| fault isolation | J | 障害分離 |
| composite alarm (CloudWatch) | J | 複合アラーム |
| rate limiting | J | レート制限 |
| practice run (ARC) | J | 練習実行 |
| prescaling | J | 事前スケーリング |
| failure mode analysis | J | 障害モード分析 |
| economies of scale | J | 規模の経済 |
| MTBF / MTTR | J | MTBF（平均故障間隔）/ MTTR（平均復旧時間）, gloss on first mention |
| RPO / RTO | J | RPO（目標復旧時点）/ RTO（目標復旧時間）, gloss on first mention |
| blast radius | E+J | blast radius（障害の影響範囲） |
| poison pill | E+J | poison pill（障害を引き起こす毒入りリクエスト） |
| bulkhead | E+J | bulkhead（船の隔壁） |
| constant work | E+J | constant work（負荷に関係なく常に同じ量の仕事をする設計） |
| load shedding | E+J | load shedding（過負荷時に一部のリクエストを断る） |
| bake time | E+J | bake time（配ったあと様子を見る待ち時間） |
| wave (deployment) | E+J | wave（段階的デプロイの1段） |
| one-box | E+J | one-box（本番の一部だけに先に配る最初の段） |
| big red button | E+J | big red button（緊急停止ボタン） |
| failover domain | E+J | failover domain（まとめてフェイルオーバーする範囲） |
| scatter-gather | E+J | scatter-gather（全体に問い合わせて結果を集める） |
| override table | E+J | override table（例外を上書きする表） |
| siloing | E+J | siloing（AZ などの内側だけで受けて送るよう閉じる）. 「サイロ化」 reads as the pejorative |
| the messy middle | E+J | messy middle（移行途中の混沌とした段階） |
