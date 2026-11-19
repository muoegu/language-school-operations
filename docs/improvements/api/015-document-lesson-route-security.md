# API追加改善 015: レッスン系ルートのOpenAPI認証要件

## 目的

レッスン予定と授業記録は全ルートでセッション認証を必須としている。OpenAPIのレッスン系操作にもCookie認証要件を記載し、利用者が認証漏れのリクエストを組み立てないようにする。

## 変更内容

- レッスンCRUD全操作に`portfolioSession`を追加
- 授業記録CRUD全操作に`portfolioSession`を追加
- OpenAPI HTTPテストで認証要件を検証

## チェック

- [x] レッスン系OpenAPI定義を更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
