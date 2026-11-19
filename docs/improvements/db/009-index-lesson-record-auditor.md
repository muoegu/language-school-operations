# DB改善 009: レッスン記録の記録者インデックス

## 目的

レッスン記録の`recorded_by_user_id`は監査情報として保持しているが、検索用インデックスがなかった。記録者別の監査・確認クエリが逐次走査にならないようにする。

## 変更内容

- `lesson_records_recorded_by_user_idx`を追加

## 互換性

APIレスポンスとデータ内容は変更しない。インデックスのみの追加である。

## チェック

- [x] Drizzleスキーマにインデックスを追加
- [x] マイグレーション生成 (`api/drizzle/0019_old_silver_surfer.sql`)
- [x] APIビルド
- [x] APIテスト (5 files / 34 tests)
- [x] Gitコミット
