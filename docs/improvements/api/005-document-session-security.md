# API改善 005: OpenAPIへのセッション認証定義追加

## 目的

実際のAPIは`portfolio_session`というHttpOnly Cookieで認証しているが、OpenAPIドキュメントに認証方式が定義されていなかった。Swagger UIや生成クライアント利用者が認証方式を把握できるようにする。

## 変更内容

- OpenAPIの`components.securitySchemes`にCookie認証を追加
- 認証Cookie名とDemo用途であることを説明
- OpenAPI契約テストで定義を検証

## 注意

今回の変更はドキュメント定義のみで、認証の実装やCookie属性は変更しない。

## チェック

- [x] OpenAPI security schemeを追加
- [x] OpenAPI契約テストを追加
- [x] APIビルド
- [x] APIテスト (5 files / 33 tests)
- [x] Gitコミット
