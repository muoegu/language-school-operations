# API改善 006: Readinessチェックの実態化

## 目的

`/readyz`がDB接続だけを確認していたため、ログインに必要な`DEMO_SESSION_SECRET`が未設定でもreadyと判定され、実際のログイン時に500が発生していた。起動に必要な依存関係を同じチェックで確認する。

## 変更内容

- DB接続失敗を503として返す
- 本番環境で`DEMO_SESSION_SECRET`がない場合を503として返す
- 未準備時も詳細なSecret値は返さず、チェック状態だけ返す
- OpenAPIに503レスポンスを追加

## チェック

- [x] Readinessチェックを実装
- [x] APIビルド
- [x] APIテスト (5 files / 33 tests)
- [x] Gitコミット
