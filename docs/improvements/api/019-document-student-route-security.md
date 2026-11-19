# API追加改善 019: 生徒CRUDのOpenAPI認証要件

## 目的

生徒CRUDは未認証で利用できない。先生は担当生徒のみ、代表者は全体を扱うという実装上の認証境界をOpenAPIにも反映する。

## 変更内容

- 生徒CRUD全操作に`portfolioSession`を追加
- OpenAPI HTTPテストで一覧操作の要件を検証

## チェック

- [x] OpenAPI定義を更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
