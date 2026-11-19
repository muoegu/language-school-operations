# DB追加改善 030: 支払い記録監査日時の順序制約

## 目的

支払い記録の`updated_at`が`created_at`より前になると、変更履歴の時系列が壊れる。監査用日時の基本的な順序をDBで保証する。

## 変更内容

- `payment_records.updated_at >= created_at`のCHECK制約を追加

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0040_cool_red_wolf.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
