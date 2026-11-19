# DB追加改善 021: 出勤記録メモの空白値防止

## 目的

出勤記録メモは任意項目だが、入力される場合は空白だけの値を保存しない。後から確認する管理情報の品質をDBで保証する。

## 変更内容

- `attendance_records.note`はNULLまたは空白以外に制限

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0031_calm_thunderbolt_ross.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
