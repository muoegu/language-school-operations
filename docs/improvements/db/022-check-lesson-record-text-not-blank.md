# DB追加改善 022: 授業記録テキストの空白値防止

## 目的

授業記録のメモと次回内容は任意項目だが、入力された場合に空白だけの値を保存すると記録の有無を誤認しやすい。記録データの品質をDBでも保証する。

## 変更内容

- `lesson_records.note`をNULLまたは空白以外に制限
- `lesson_records.next_content`をNULLまたは空白以外に制限

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0032_grey_enchantress.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
