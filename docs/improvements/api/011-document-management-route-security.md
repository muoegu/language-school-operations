# API改善 011: 管理系ルートのOpenAPI認証要件

## 目的

管理画面向けのダッシュボード警告と支払い集計は、実装上セッション認証と代表者ロールを要求している。OpenAPIにもCookie認証を明示し、Swagger UI利用者が必要な認証条件を把握できるようにする。

## 変更内容

- `GET /dashboard/alerts` に `portfolioSession` セキュリティ要件を追加
- `GET /reports/payment-records` に `portfolioSession` セキュリティ要件を追加

## 互換性

実際の認証・認可ロジックは変更しない。APIレスポンスも変更しない。OpenAPIドキュメントのみがより正確になる。

## チェック

- [x] 対象ルートのOpenAPI定義を更新
- [x] APIビルド
- [x] APIテスト（5ファイル・34テスト）
- [x] 差分チェック
- [x] Gitコミット
