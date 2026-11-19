# API追加改善 016: 現在ユーザー系OpenAPI認証要件

## 目的

`/me`と`/me/students`は実装上セッションCookieを必須とする。OpenAPIにも認証要件を記載し、ログイン後のユーザー情報APIを正しく利用できるようにする。

## 変更内容

- `GET /me`に`portfolioSession`を追加
- `GET /me/students`に`portfolioSession`を追加
- OpenAPI HTTPテストで要件を検証

## チェック

- [x] OpenAPI定義を更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
