# DB追加改善 018: 教科書出版社の空白値防止

## 目的

教科書の出版社は必須項目だが、文字列の空白だけの値は現在のNOT NULLでは防げない。管理一覧や請求書の識別情報として意味のある出版社名を保証する。

## 変更内容

- `textbooks.publisher`に空白禁止CHECK制約を追加

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0028_brainy_phantom_reporter.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
