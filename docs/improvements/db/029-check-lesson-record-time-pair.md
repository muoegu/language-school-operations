# DB追加改善 029: 授業実績時刻のペア整合性

## 目的

授業記録の実績開始・終了時刻は、完了記録では両方が必要で、未入力なら両方NULLであるべき。片方だけの保存をDBで防ぐ。

## 変更内容

- `actual_start_at`と`actual_end_at`を両方NULLまたは両方入力に制限

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0039_melted_marvex.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
