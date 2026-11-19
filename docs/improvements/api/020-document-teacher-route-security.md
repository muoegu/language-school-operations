# API追加改善 020: 講師CRUDのOpenAPI認証要件

## 目的

講師CRUDは代表者だけが操作できる既存APIである。未認証利用を防ぐCookie認証要件をOpenAPIにも明示する。

## 変更内容

- 講師CRUD全操作に`portfolioSession`を追加
- OpenAPI HTTPテストで一覧操作の要件を検証

## チェック

- [x] OpenAPI定義を更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
