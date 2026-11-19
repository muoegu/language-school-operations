# DB改善 001: 外部キー検索用インデックスの追加

## 目的

レッスンと支払い記録は、クラス情報とのJOINやクラスIDによる絞り込みが発生する。外部キー列に明示的なインデックスがないため、データ量が増えた場合に逐次走査へ傾きやすい。

## 対象

- `lessons.class_id`
- `payment_records.class_id`

## 変更内容

- `lessons_class_idx` を追加
- `payment_records_class_idx` を追加

既存のAPIレスポンス、入力形式、削除ポリシー、データ内容は変更しない。

## チェック

- [x] Drizzleスキーマにインデックスを追加
- [x] マイグレーション生成 (`api/drizzle/0012_absurd_bruce_banner.sql`)
- [x] APIビルド
- [x] APIテスト (5 files / 32 tests)
- [x] Gitコミット

## ロールバック

生成されたマイグレーションのインデックス作成文を逆順に削除する。テーブルやレコードは削除しない。
