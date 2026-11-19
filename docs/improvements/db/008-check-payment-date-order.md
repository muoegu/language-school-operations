# DB改善 008: 支払期限の時系列制約

## 目的

支払い記録の支払期限が購入日より前になる不整合を防止する。請求書や未払いアラートの基準日をDBレベルで妥当な範囲に保つ。

## 変更内容

- `payment_records.due_date`がNULLまたは購入日の暦日以降であることをCHECK制約で保証

## 互換性

既存のAPI形式・日付表示形式は変更しない。期限なしの支払い記録は引き続き許可する。

## チェック

- [x] DrizzleスキーマにCHECK制約を追加
- [x] マイグレーション生成 (`api/drizzle/0018_uneven_gressill.sql`)
- [x] APIビルド
- [x] APIテスト (5 files / 34 tests)
- [x] Gitコミット
