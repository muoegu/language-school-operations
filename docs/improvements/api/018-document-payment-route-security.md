# API追加改善 018: 支払い記録CRUDのOpenAPI認証要件

## 目的

支払い記録CRUDは代表者限定の既存APIである。全操作にCookie認証要件を記載し、OpenAPIからも保護されたリソースであることを明確にする。

## 変更内容

- 支払い記録CRUD全操作に`portfolioSession`を追加
- OpenAPI HTTPテストで一覧操作の要件を検証

## チェック

- [x] OpenAPI定義を更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
