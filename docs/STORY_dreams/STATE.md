# STORY_dreams STATE

1. **モードと制約**: ゲームモード・実装データ(TS+シーン配線)。既存物語(5章+40縁起+3結末+夢1)は無改変で拡張。ユーザー選択=A案(夢渡りの連作)。
2. **採用案**: 夢渡りの連作7篇(汐里と玄冬の千年前)。ビート表=`docs/STORY_dreams/BEATS.md`(必須参照)。
3. **完了ビート/章**: 全7篇 本文・実装・検証完了。証跡=`src/core/data/dreams.ts`(本文7篇)・`src/core/store.ts`(発火)・`src/ui/Scenes.tsx`(DreamEpScene)・`src/App.tsx`(ルート/BGM)。機械QA: tsc緑・発火/既読/連作順序/復帰を実プレイ確認。独立評価(opus): **合格22/25**(全軸≥3・blocking 0)、non-blocking 4件全て反映済み。provenance: オリジナル判定クリア(俺屍はシステム着想のみ・表現借用なし)。
4. **次の一手**: **完結(terminal)——再開しない**。(任意の将来拡張: 夢の既読再読機能を図鑑/家譜に置く場合は別ストーリーとして起票)
