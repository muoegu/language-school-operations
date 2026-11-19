# Portfolio System API

Honoで構築するポートフォリオ用APIの最小構成です。

## 開発サーバー

リポジトリのルートで依存関係をインストールします。

```bash
pnpm install
```

APIを起動します。

```bash
pnpm dev:api
```

Cloudflare Workersのローカルランタイムで起動する場合：

```bash
pnpm --dir api dev:worker
```

デフォルトのポートは `3000` です。`PORT` で変更できます。

```bash
PORT=3001 pnpm dev:api
```

## 動作確認

ヘルスチェック：

```bash
curl http://localhost:3000/api/v1/healthz
```

デモログイン：

```bash
curl http://localhost:3000/api/v1/auth/demo/options
curl -i -X POST http://localhost:3000/api/v1/auth/demo/login \
  -H 'Content-Type: application/json' \
  -d '{"teacherId":"00000000-0000-0000-0000-000000000002","password":"demo"}'
curl http://localhost:3000/api/v1/me/students
```

本番では `DEMO_SESSION_SECRET` をCloudflare Workers Secretとして設定する。

レッスン登録：

```bash
curl -X POST http://localhost:3000/api/v1/lessons \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherIds": ["00000000-0000-0000-0000-000000000002"],
    "studentIds": ["00000000-0000-0000-0000-000000000003"],
    "title": "Business Japanese",
    "scheduledStart": "2026-11-20T01:00:00.000Z",
    "scheduledEnd": "2026-11-20T02:00:00.000Z"
  }'
```

一覧取得：

```bash
curl http://localhost:3000/api/v1/lessons
curl 'http://localhost:3000/api/v1/lessons?status=scheduled'
```

OpenAPI仕様書（JSON）：

```bash
curl http://localhost:3000/api/v1/doc
```

APIテスト：

```bash
pnpm --dir api test
```

現在はDB接続なしで20件のAPI契約・認証・入力検証テストを実行する。DB統合テストはテスト用NeonブランチまたはローカルPostgreSQLを用意した後に追加する。

Kubbは起動中のOpenAPIエンドポイントを直接読み込む。APIを起動した状態で、次のコマンドを実行する。

```bash
pnpm dev:api
pnpm --dir web generate:api
```

Swagger UI：

```text
http://localhost:3000/api/v1/docs
```

## Cloudflare Workersへのデプロイ

このAPIはNode.jsサーバーとCloudflare Workersの両方をエントリーポイントとして持ちます。フロントのVue SPAは`web/cloudflare.config.ts`からこのWorkerエントリーポイントを読み込み、Workers Static Assetsと同じWorkerで配信します。

- Nodeローカル起動：`src/index.ts`
- Workersエントリーポイント：`src/worker.ts`
- API単体Workers設定：`cloudflare.config.ts`
- 統合Workers設定：`../web/cloudflare.config.ts`
- DB接続：`env.DATABASE_URL` からNeon HTTPを生成

Cloudflare CLI (`cf`) を使用します。Wranglerの設定ファイルは作成していません。

```bash
pnpm types:worker
pnpm build:worker
pnpm --dir web exec cf deploy
```

初回デプロイ前に、Cloudflare CLIへのログインとWorkers Secretの設定が必要です。

```bash
cf auth login
cf deploy --help
```

`DATABASE_URL` はソースコードや `cloudflare.config.ts` に値を書かず、デプロイ時のSecretとして管理します。ローカルNode起動では `api/.env` またはリポジトリルートの `.env` に設定してください。

Workersのヘルスチェックは `/api/v1/healthz`、DBまで含む準備状態の確認は `/api/v1/readyz` です。

## 現在の範囲

- システム：`GET /api/v1/healthz`、`GET /api/v1/readyz`
- 講師：一覧・詳細・作成・部分更新・論理削除
- 生徒：一覧・詳細・作成・部分更新・論理削除
- レッスン：一覧（`status`絞り込み）・詳細・作成・部分更新・論理削除（キャンセル）
- OpenAPI：`GET /api/v1/doc`、Swagger UI `GET /api/v1/docs`
- DB接続：Neon HTTP + Drizzle ORM。レッスンを含むCRUDデータはPostgreSQLへ保存する

### 現在未実装の設計項目

次のAPIは設計書に定義しているが、現時点ではルートを実装していない。

- 授業実績：`POST /api/v1/lessons/:lessonId/record`
- 講師別月間集計：`GET /api/v1/reports/teacher-monthly`
- 認証・認可、レート制限、監査ログ

ルートはドメインごとの `src/features/*/routes.ts` に分割し、`src/app.ts` は共通ミドルウェアとルート登録だけを担当します。Nodeサーバーの起動と `/api/v1` のプレフィックス処理は `src/index.ts`、Workersのエントリーポイントは `src/worker.ts` です。

ドメイン別の構成と追加手順は [docs/api/api-structure.md](../docs/api/api-structure.md) を参照してください。
