# API追加改善 014: Probe応答のキャッシュ制御

## 目的

Cloudflare Workersや監視サービスが`healthz`・`readyz`を利用する場合、キャッシュされた応答では現在の稼働状態を正しく判定できない。Probe応答を常に最新状態として扱えるようにする。

## 変更内容

- `/healthz`と`/readyz`に`Cache-Control: no-store`を追加
- `/readyz`が503を返す場合に`Retry-After: 5`を追加

## チェック

- [x] Probe応答のヘッダーを更新
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] 差分チェック
- [x] Gitコミット
