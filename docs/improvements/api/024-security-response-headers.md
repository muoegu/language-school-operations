# API追加改善 024: 共通セキュリティレスポンスヘッダー

## 目的

既存APIのすべてのレスポンスに、MIMEスニッフィング防止とリファラー情報抑制のヘッダーを付ける。Cloudflare Workers経由のブラウザアクセスでも共通の安全側デフォルトを確保する。

## 変更内容

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- 共通ミドルウェアで全レスポンスへ付与

## チェック

- [x] 共通ミドルウェアを更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
