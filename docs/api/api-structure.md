# APIバックエンドの構成

## 方針

APIの共通設定と業務ドメインの実装を分離する。

- `app.ts`：アプリケーションの組み立て、共通ミドルウェア、エラー処理
- `features/<domain>`：ドメイン単位のOpenAPIルート、入力スキーマ、DBサービス
- `routes`：health checkやOpenAPI UIなど、ドメインに属さないルート
- `db`：Drizzleの接続とテーブル定義
- `shared`：複数ドメインで共有するエラーなど

`soyokaze-app` の `features/<domain>/{routes,schema,service,repository}` 構成を参考にしつつ、現段階ではDBクエリが小さいためrepository層は省略している。クエリが増えたドメインから `repository.ts` を追加する。

現在の実装済みドメインは `attendance`、`auth`、`dashboard-alerts`、`lessons`、`lesson-records`、`lesson-types`、`payment-records`、`students`、`textbooks`、`teachers` である。`healthz`、`readyz`、OpenAPI JSON、Swagger UIは業務ドメインに属さないため `routes/` に置く。

認証・複数参加者対応の基盤として、`users`、`user_roles`、`staff_members`、`teacher_student_assignments`、`lesson_teachers`、`lesson_students` を追加済みである。`user_roles.user_id` は一意で、1ユーザー1ロールである。`lesson_records.next_content` も追加済み。テーブル間の関係は [docs/db/table-relationships.md](../db/table-relationships.md) を正とする。

### 移行フェーズの注意

既存の `lessons.teacher_id` と `lessons.student_id` は、既存CRUDとの互換性を保つため現時点では残している。マイグレーション `0001_simple_doctor_strange.sql` で、既存レッスンは `lesson_teachers` / `lesson_students` へバックフィルされる。APIは配列形式と中間テーブル参照に切り替え済みで、旧カラムは移行完了まで削除しない。

## ディレクトリ構成

```text
api/src/
├── app.ts                         共通設定とfeatureの登録だけを行う
├── index.ts                       Node.jsローカルサーバー
├── worker.ts                      Cloudflare Workersエントリーポイント
├── types.ts                       HonoのBindings型
├── db/
│   ├── client.ts                  リクエスト単位のNeon/Drizzle DB生成
│   ├── schema.ts                  PostgreSQLテーブル定義
│   └── seed.ts                    ローカル・デモ用seed
├── routes/
│   ├── docs.ts                    Swagger UI / OpenAPI JSON
│   └── system.ts                  healthz / readyz
├── shared/
│   └── errors.ts                  HTTPExceptionによる共通エラー
└── features/
    ├── auth/
    │   ├── routes.ts              デモログイン、現在ユーザー、担当生徒
    │   ├── schema.ts              認証関連のOpenAPIスキーマ
    │   ├── service.ts             セッション署名とユーザー参照
    │   └── session.ts             Cookieの読み取りと認証認可
    ├── dashboard-alerts/
    │   ├── routes.ts              管理部向けアラート取得のOpenAPIルート
    │   ├── schema.ts              3種類のアラートDTO
    │   └── service.ts             レッスン・支払い・誕生日の判定
    ├── attendance/
    │   ├── routes.ts              出勤記録の権限付き一覧・本人登録
    │   ├── schema.ts              出勤記録の入出力スキーマ
    │   └── service.ts             出勤記録のDB処理
    ├── payment-reports/
    │   ├── routes.ts              管理者専用の支払い集計ルート
    │   ├── schema.ts              明細・集計レスポンス
    │   └── service.ts             月別・状態別・クラス別集計
    ├── lessons/
    │   ├── routes.ts              OpenAPIルート登録とHTTP入出力
    │   ├── schema.ts              Zod/OpenAPIスキーマ
    │   └── service.ts             レッスンのDB処理
    ├── lesson-records/
    │   ├── routes.ts              授業記録CRUDのOpenAPIルート
    │   ├── schema.ts              授業記録の入出力スキーマ
    │   └── service.ts             状態更新と記録のDB処理
    ├── lesson-types/
    │   ├── routes.ts              レッスン種別CRUDのOpenAPIルート
    │   ├── schema.ts              レッスン種別の入出力スキーマ
    │   └── service.ts             レッスン種別のDB処理
    ├── payment-records/
    │   ├── routes.ts              支払い記録CRUDのOpenAPIルート
    │   ├── schema.ts              支払い記録の入出力スキーマ
    │   └── service.ts             金額計算・紐付け・残り回数のDB処理
    ├── students/
    │   ├── routes.ts
    │   ├── schema.ts
    │   └── service.ts
    ├── textbooks/
    │   ├── routes.ts              教科書CRUDのOpenAPIルート
    │   ├── schema.ts              教科書の入出力スキーマ
    │   └── service.ts             教科書のDB処理
    └── teachers/
        ├── routes.ts
        ├── schema.ts
        └── service.ts
```

## リクエストの流れ

```text
Request
  ↓
worker.ts / index.ts
  ↓ /api/v1 プレフィックスを除去
app.ts
  ↓ 共通CORS・エラー処理
features/*/routes.ts
  ↓ OpenAPI + Zodで入力検証
features/*/service.ts
  ↓ getDb(c.env)
db/client.ts → Neon HTTP → PostgreSQL
```

`routes.ts` は `OpenAPIHono` に対する登録関数（`registerStudentRoutes(app)` など）を公開する。`app.ts` で登録順を一元管理することで、NodeとWorkersが同じAPI契約を共有する。

## 各層の責務

### `app.ts`

ルートの業務処理を書かない。共通ミドルウェア、`onError`、`notFound`、各featureの登録だけを担当する。

### `routes.ts`

HTTPのパス、メソッド、OpenAPI response、`c.req.valid()` による入力取得を担当する。SQLや重複チェックはserviceへ渡す。

### `schema.ts`

リクエスト・レスポンスのZodスキーマとOpenAPIのcomponent名を定義する。フロントエンドの型生成元になるため、APIの契約をここに集約する。

### `service.ts`

DB操作、ページング、重複チェック、論理削除などの業務ルールを担当する。HonoのContextを直接参照せず、DBと入力値を引数で受け取るためテストしやすくする。

### 認可の現状

- `GET /me/students` は講師の担当生徒だけを返す。
- `GET /students/:studentId` は担当関係を検証する。
- `GET /lessons` と `GET /lessons/:lessonId` は講師が参加するレッスンだけを返す。
- `representative` / `staff` ロールはスケジュール全件を参照できる。
- `representative` のみ全レッスン記録を参照・編集できる。`staff` は記録を参照できない。
- 講師は自分を講師に含め、担当中の生徒だけを指定してレッスンを作成できる。
- 講師は自分が参加するレッスンだけを更新・キャンセルできる。
- `representative` はレッスンを全件作成・更新・キャンセルできる。
- `staff` はスケジュールを閲覧できるが、レッスン記録は取得できない。

## ルート追加の手順

新しい業務領域を追加する場合は、次の順番で作る。

1. `api/src/features/<domain>/schema.ts` に入出力スキーマを作る
2. `api/src/features/<domain>/service.ts` にDB・業務処理を作る
3. `api/src/features/<domain>/routes.ts` にOpenAPI routeを作る
4. `register<Domain>Routes(app)` を `app.ts` から1回だけ登録する
5. Node/Workersの型チェック、OpenAPI確認、必要なserviceテストを実行する

## 参考にした原則

- Honoはルートを別のHonoインスタンスや登録関数へ分け、親アプリへ組み込める
- OpenAPIルートは `createRoute` と `app.openapi` で入力・出力契約を定義する
- HTTPエラーは `HTTPException` を投げ、トップレベルの `app.onError` で統一的に処理する

参考：

- [Hono Routing](https://hono.dev/docs/api/routing)
- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Hono HTTPException](https://hono.dev/docs/api/exception)
