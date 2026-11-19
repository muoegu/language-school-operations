# Cloudflare Workersデプロイ構成

## 1. 結論

APIとVue SPAは、Cloudflare Pagesを使わず、Workers Static Assetsを利用する同一Worker構成に変更済みである。デプロイはまだ実行していない。

| 項目 | 現在の構成 |
| --- | --- |
| APIフレームワーク | Hono |
| 統合Worker設定 | `web/cloudflare.config.ts` |
| Workersエントリーポイント | `api/src/worker.ts` |
| Nodeローカル用エントリーポイント | `api/src/index.ts` |
| Cloudflare設定 | `web/cloudflare.config.ts`（フロント＋APIの統合Worker） |
| デプロイCLI | Cloudflare公式 `cf` CLI |
| DB接続 | Neon Serverless DriverのHTTP接続 + Drizzle ORM |
| Secret | `DATABASE_URL`。Cloudflare側のSecretとして注入 |
| OpenAPI JSON | `/api/v1/doc` |
| Swagger UI | `/api/v1/docs` |

Wrangler用の `wrangler.jsonc` / `wrangler.toml` は使用しない。統合Workerでは`web/cloudflare.config.ts`を正とする。`api/cloudflare.config.ts`はAPI単体Worker向けの既存設定として残している。

### 1.1 統合Workerの構成

```text
web/cloudflare.config.ts
  ├── 静的アセット：webのVue/Viteビルド
  └── Worker entrypoint：api/src/worker.ts
        ├── /api/*       -> Hono API
        └── その他のパス -> Workers Static Assets（SPA fallback）
```

`assets.notFoundHandling = "single-page-application"`により、Vue Routerの画面URLを`index.html`へフォールバックする。`/api/*`だけはWorkerを先に実行する。

## 2. Workers対応で確認・修正した点

### 2.1 NodeサーバーとWorkersのエントリーポイントを分離

Node向けの `@hono/node-server` はWorkersランタイムで実行しない。

```text
api/src/index.ts   -> @hono/node-serverでローカル起動
api/src/worker.ts  -> Workersのfetchハンドラ
api/src/app.ts     -> Honoアプリとルート定義を共有
```

両方のエントリーポイントで `/api/v1` を取り除いてからHonoアプリへ渡すため、ローカルと本番でAPIパスを統一している。

### 2.2 DB接続をリクエストの環境変数から生成

WorkersにはNodeの `process.env` やdotenvファイルは存在しない。そのため、DBクライアントはモジュール初期化時に生成せず、各リクエストの `env.DATABASE_URL` を使って生成する。

```ts
const db = getDb(c.env);
```

`drizzle-orm/neon-http` と `@neondatabase/serverless` を利用しているため、TCP接続を前提とするNode専用のDBクライアントをWorkersへ持ち込まない。

### 2.3 Cloudflare設定

`web/cloudflare.config.ts` で次を定義している。

- Worker名：`portfolio-system`
- compatibility date：`2026-11-17`（現在のローカル `workerd` が対応する最新日。ランタイム更新時に追随する）
- `nodejs_compat`
- `DATABASE_URL` のSecret binding
- `ASSETS` のStatic Assets binding
- `NODE_ENV` の非Secret変数
- Workers Logs
- Workers Traces

Secret値は設定ファイルへ書かず、CloudflareのSecret管理を使う。

### 2.4 型生成

Cloudflare設定からWorker型を生成する。

```bash
pnpm types:worker
```

生成物は `web/.cloudflare/types/` に作られる。これはローカル生成物なのでGit管理しない。bindingを追加・変更した場合は、必ず型を再生成してから型チェックする。

## 3. ローカル実行

ローカルNode起動用の `api/.env` は、リポジトリルートの `.env.local` を参照するシンボリックリンクとして用意できる。これはローカル専用であり、接続URLやSecretはGitへ追加しない。

### Nodeサーバー

Neonの接続URLをローカル環境変数へ設定する。

```bash
export DATABASE_URL='postgresql://...'
pnpm dev:api
```

`DATABASE_URL` が設定されていない場合、Node起動時にエラーになる。`/api/v1/healthz` はDB不要だが、`/api/v1/readyz` とCRUDはNeon接続が必要である。

確認先：

```text
http://localhost:3000/api/v1/healthz
http://localhost:3000/api/v1/readyz
http://localhost:3000/api/v1/docs
```

### Workersランタイム

```bash
pnpm dev:worker
```

Workersローカルランタイムでは、Node起動用の`api/src/index.ts`ではなく`api/src/worker.ts`が利用される。ローカルSecretや環境変数の扱いは、利用する`cf` CLIの案内に従い、値をGitへコミットしない。

## 4. デプロイ手順

### 4.1 認証

```bash
cf auth login
```

CIでは対話ログインではなく、Cloudflareが推奨するAPI Token等の非対話認証を利用する。

### 4.2 Secret

`DATABASE_URL` はSecretとして設定する。コマンドや利用可能なオプションは、インストールされている `cf` CLIのバージョンで確認する。

```bash
cf deploy --help
```

値をリポジトリの `.env`、設定ファイル、README、ログへ書かない。

ローカルWorkers実行時は `.dev.vars` 等を使用できるが、これらはGit管理しない。

### 4.3 dry run / build / deploy

```bash
pnpm types:worker
pnpm build:worker
pnpm --dir web exec cf deploy --dry-run
pnpm --dir web exec cf deploy
```

初回デプロイではWorker名、アカウント、Secret、DB接続先を確認してから実行する。`workersDev: true` のため、まずは `*.workers.dev` の検証環境で確認できる構成である。

## 5. DBに関する注意

WorkersデプロイとDB migrationは別の処理である。

- `drizzle-kit generate`：migration SQLを生成する
- `drizzle-kit migrate`：Node環境からDBへ適用する
- Workerリクエスト：Neon HTTP経由でアプリケーションSQLを実行する

migrationやseedをWorkerリクエストから実行しない。DB変更はレビュー済みSQLを、管理されたCIまたはローカルの管理コマンドから適用する。

Neonのリージョンが確定したら、WorkersのPlacement方針も確認する。現段階ではリージョン情報が未確定のため、誤ったリージョンを設定していない。

## 6. 本番前チェックリスト

- [ ] `DATABASE_URL` をCloudflare Secretへ設定した
- [ ] 実在データではなくデモ用DB・架空データを使用している
- [ ] `pnpm types:worker` が成功する
- [ ] `pnpm build:worker` が成功する
- [ ] `cf deploy --dry-run` で設定を確認した
- [ ] `/api/v1/healthz` が200を返す
- [ ] `/api/v1/readyz` がDB接続成功時に200を返す
- [ ] `/api/v1/doc` と `/api/v1/docs` が公開範囲として適切である
- [ ] Workers LogsとTracesを確認できる
- [ ] CORSの許可Originを本番フロントエンドに限定する
- [ ] 書き込みAPIに認証・レート制限を追加する
- [ ] OpenAPIのエラー応答と認証要件を本番仕様に更新する

## 7. 現時点の制約

応募用MVPでは認証を省略している。Workersへデプロイできることと、本番運用に必要なセキュリティが揃っていることは別である。

本番利用前に、少なくとも次を追加する。

- 認証・認可
- CORSの固定許可Origin
- 書き込みAPIのレート制限
- 監査ログ
- migrationのCI/CD手順
- DB障害時のエラー監視

