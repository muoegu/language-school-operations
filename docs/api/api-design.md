# API構成設計

## 1. 文書の目的

`docs/disco_vue_portfolio_spec.md` に記載した応募用MVPを、実装可能なAPI単位まで具体化する。

対象とする業務フローは次のとおり。

1. 講師・生徒を選択してレッスン予定を登録する
2. レッスン一覧から対象の予定を検索する
3. 実施・欠席・キャンセルなどの授業実績を記録する
4. 講師別・月別に授業件数と実施時間を集計する

支払い、勤怠、休暇申請、監査ログは今回のMVPのAPI対象外とする。デモ認証と代表・先生・スタッフの参照・操作認可は実装対象に含める。

### 実装状況（2026-11時点）

この文書は「現在のMVP」と「次段階の設計」を同じ契約書で管理する。実装済みAPIは次のとおりである。

| 領域 | 実装済み | 備考 |
| --- | --- | --- |
| システム | `GET /healthz`、`GET /readyz` | `readyz` はDB接続を確認 |
| 講師 | 一覧・詳細・作成・更新・論理削除 | `features/teachers` |
| 生徒 | 一覧・詳細・作成・更新・論理削除 | `features/students` |
| クラス | 一覧・詳細・作成・更新・無効化 | `features/lesson-types`。実装フォルダは段階移行中。時間・レベル・料金のマスタ |
| 教科書 | 一覧・詳細・作成・更新・販売終了 | `features/textbooks`。名称・出版社・価格のマスタ |
| 支払い記録 | 一覧・詳細・作成・更新・取消 | `features/payment-records`。5レッスン分＋教科書代を管理 |
| レッスン | 一覧・詳細・作成・部分更新・論理削除 | `features/lessons`。削除はキャンセル扱い |
| 授業記録 | 取得・作成・更新・削除 | `features/lesson-records`。メモ・次回内容を保持 |
| 認証 | デモログイン・ログアウト・現在ユーザー・担当生徒 | `features/auth`。HttpOnly Cookie、1ユーザー1ロール |
| ダッシュボードアラート | 顧客フォロー・支払い遅延・誕生日 | `features/dashboard-alerts`。代表ロールのみ参照可能 |
| 出勤記録 | 出退勤の登録・一覧 | `features/attendance`。閲覧は代表・スタッフが全員、講師は自分のみ |
| 支払いレポート | 全支払い記録・集計 | `features/payment-reports`。代表ロールのみ参照可能 |
| OpenAPI | `/doc`、`/docs` | JSONとSwagger UI |

講師別月間集計と監査ログは未実装である。未実装項目を現行APIの利用可能エンドポイントとして扱わない。

## 2. APIの基本方針

| 項目 | 方針 |
| --- | --- |
| APIサーバー | Hono |
| 実行環境 | Node.js（ローカル） / Cloudflare Workers（公開環境） |
| 型・入力検証 | Zod。リクエストと環境変数を実行時検証する |
| DBアクセス | Drizzle ORM |
| DB | PostgreSQL |
| APIクライアント | OpenAPI仕様をKubbで生成し、Vue Query Composableから利用する |
| 文字コード | UTF-8 |
| 日時 | APIではISO 8601。保存はUTC、画面表示時にローカルタイムへ変換 |
| ページング | `page` と `pageSize`。初期値は `page=1`, `pageSize=20` |
| 認証 | デモでは講師選択式の署名付きHttpOnly Cookie。本番はBetter Auth等へ移行 |
| 更新方式 | REST風のHTTP API。状態変更は専用エンドポイントで業務ルールを明示 |

### ベースURL

ローカル開発時は次のURLを使用する。

```text
http://localhost:3000/api/v1
```

公開環境ではフロントエンドと同一ドメイン配下の `/api/v1` を推奨する。将来別ドメインに分離する場合はCORSの許可オリジンを明示的に設定する。

## 3. リソース構成

```text
/api/v1
├── /healthz                        Worker/APIの稼働確認
├── /readyz                         DB接続を含む準備状態確認
├── /teachers                       講師（CRUD実装済み）
├── /students                       生徒（CRUD実装済み）
├── /classes                        クラス・料金（CRUD実装済み）
├── /textbooks                      教科書・価格・販売状態（CRUD実装済み）
├── /payment-records                支払い記録（CRUD実装済み）
├── /dashboard/alerts               ダッシュボードの顧客アラート（代表のみ）
├── /attendance-records              出勤記録（本人登録・権限別一覧）
├── /reports/payment-records         支払い記録レポート（代表のみ）
├── /lessons                        レッスン予定
│   ├── GET /                       一覧・検索
│   ├── POST /                      登録
│   ├── GET /:lessonId              詳細
│   ├── PATCH /:lessonId            予定情報の編集
│   └── DELETE /:lessonId           キャンセル（論理削除）
├── /lessons/:lessonId/record       授業記録（メモ・次回内容）
│   ├── GET                         取得
│   ├── POST                        登録
│   ├── PATCH                       更新
│   └── DELETE                      削除
├── /auth/demo                      デモ認証
│   ├── GET /options                講師選択肢
│   ├── POST /login                 ログイン
│   └── POST /logout                ログアウト
├── /me                             現在ユーザー
├── /me/students                    担当生徒
└── /reports
    └── GET /teacher-monthly        講師別月間実績（次段階）
```

### 3.1 クラス

`/classes` は料金表に表示するクラスマスタAPIである。`name`、`level`、`durationMinutes`、`priceMinor`、`currency`、`isActive` を扱う。

- `GET /api/v1/classes`：一覧。`q`、`active`、`page`、`pageSize` に対応
- `GET /api/v1/classes/:classId`：詳細
- `POST /api/v1/classes`：登録
- `PATCH /api/v1/classes/:classId`：部分更新
- `DELETE /api/v1/classes/:classId`：`isActive=false` にする

### 3.2 教科書

`/textbooks` は教科書一覧・価格表のマスタAPIである。`title`、`publisher`、`priceMinor`、`currency`、`status` を扱う。`status` は `selling` または `discontinued` とする。

- `GET /api/v1/textbooks`：一覧。`q`、`status`、`page`、`pageSize` に対応
- `GET /api/v1/textbooks/:textbookId`：詳細
- `POST /api/v1/textbooks`：登録
- `PATCH /api/v1/textbooks/:textbookId`：部分更新
- `DELETE /api/v1/textbooks/:textbookId`：`status=discontinued` にする

生徒別購入履歴、請求書、入金記録は未実装であり、次段階で追加する。

### 3.3 支払い記録

`/payment-records` は、生徒ごとの5レッスン分の支払いと教科書代を管理する。チケット枚数は保持せず、残り回数は利用レッスンの紐付け件数から `5 - 利用件数` で算出する。

- `GET /api/v1/payment-records`：一覧。`studentId`、`status`、`paymentStatus`、`page`、`pageSize` に対応
- `GET /api/v1/payment-records/:paymentRecordId`：詳細。教科書、利用レッスン、残り回数を含む
- `POST /api/v1/payment-records`：登録。レッスン種別単価×5と教科書価格から金額をサーバー側で計算
- `PATCH /api/v1/payment-records/:paymentRecordId`：教科書、利用レッスン、支払い状態などを更新
- `DELETE /api/v1/payment-records/:paymentRecordId`：`status=cancelled` にする

利用レッスンは完了済みで、対象生徒が参加者である必要がある。1件の支払いに紐付けられる利用レッスンは最大5件である。

APIのレスポンスにはDBの内部実装をそのまま返さず、画面が必要とするDTOを返す。内部のテーブル名やカラム名を変更しても、APIの契約を維持しやすくするためである。

### 3.4 ダッシュボードアラート

`GET /api/v1/dashboard/alerts` で、管理部向けダッシュボードに表示する3種類のアラートを1回のリクエストで取得する。認証済みの `representative` ロールだけが利用でき、講師・スタッフは `403 FORBIDDEN` となる。

レスポンスは次の3配列を持つ。

- `noRecentLessons`：21日以上レッスンがない顧客。`lastLessonDate` と `daysSinceLastLesson` を返す。レッスン履歴がない場合は `lastLessonDate=null` とする
- `overduePayments`：支払い状態が未払いで、締切日を過ぎた支払い記録。`dueDate`、`daysOverdue`、`totalAmountMinor`、`currency` を返す
- `upcomingBirthdays`：今日から30日以内の誕生日。`birthDate` と `daysUntilBirthday` を返す

誕生日は年を除いた月日で判定し、今年の誕生日を過ぎている場合は翌年の誕生日として計算する。各配列は画面でそのまま表示できる顧客名付きDTOであり、集計用のDB内部値は公開しない。

### 3.5 出勤記録

出勤記録は `users` に紐付く。全件参照権限を持つ代表・スタッフは、`userId` クエリパラメータで対象ユーザーを絞り込める。画面ではユーザー選択後に1人分を表示する想定である。

- `GET /api/v1/attendance-records`：権限に応じた一覧。`userId`、`from`、`to` で絞り込み可能
- `GET /api/v1/attendance-records?userId={userId}`：代表・スタッフが特定ユーザーの記録を取得
- 講師が `userId` を省略した場合は自分の記録のみ。自分以外の `userId` を指定すると `403 FORBIDDEN`
- `POST /api/v1/attendance-records`：ログイン中のユーザー本人の記録として登録。リクエストボディに `userId` は持たせず、セッションのユーザーIDをサーバー側で使用する
- 同一ユーザー・同一日付は1件まで。重複登録は `409 DUPLICATE_RESOURCE`

POSTの入力は `attendanceDate`、`clockInAt`、`clockOutAt`、`status`、`note`。管理者であっても他ユーザーとしての代理登録はできない。

## 4. 共通仕様

### 4.1 成功レスポンス

単一リソースは `data`、一覧は `data` と `meta` を返す。

```json
{
  "data": {
    "id": "lesson_01H..."
  }
}
```

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### 4.2 エラーレスポンス

すべてのエラーは次の形式に統一する。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください。",
    "details": [
      {
        "field": "scheduledStart",
        "reason": "開始日時は終了日時より前である必要があります。"
      }
    ],
    "requestId": "req_01H..."
  }
}
```

主なエラーコードは次のとおり。

| HTTP | code | 用途 |
| ---: | --- | --- |
| 400 | `VALIDATION_ERROR` | 必須項目、形式、値の範囲が不正 |
| 400 | `INVALID_DATE_RANGE` | 日付範囲が不正 |
| 404 | `RESOURCE_NOT_FOUND` | 講師・生徒・レッスンが存在しない |
| 409 | `SCHEDULE_CONFLICT` | 講師の時間帯が重複 |
| 409 | `INVALID_STATUS_TRANSITION` | 許可されていない状態変更 |
| 409 | `DUPLICATE_RECORD` | 同じレッスンの実績が重複 |
| 500 | `INTERNAL_SERVER_ERROR` | 想定外のサーバーエラー |

`requestId` はログと照合できるよう、APIの入口で生成する。詳細なスタックトレースやDBエラーはクライアントに返さない。

### 4.3 共通クエリパラメータ

一覧APIでは次のパラメータを利用する。

| パラメータ | 型 | 初期値 | 説明 |
| --- | --- | ---: | --- |
| `page` | integer | 1 | 1以上 |
| `pageSize` | integer | 20 | 1〜100 |
| `sort` | enum | `scheduledStart` | 許可した項目のみソート対象 |
| `order` | `asc \| desc` | `asc` | ソート順 |

## 5. エンドポイント詳細

### 5.1 デモ認証・現在ユーザー

本番認証導入前のポートフォリオ用として、講師を選択するデモログインを提供する。パスワードは入力できるが検証せず、後でBetter Auth等へ置き換える前提である。レッスン・生徒詳細・授業記録APIはログイン必須である。

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/api/v1/auth/demo/options` | ログイン可能な講師一覧 |
| `POST` | `/api/v1/auth/demo/login` | 講師IDを選択してHttpOnly Cookieを発行 |
| `POST` | `/api/v1/auth/logout` | セッションCookieを削除 |
| `GET` | `/api/v1/me` | 現在のユーザー、ロール、業務プロフィール |
| `GET` | `/api/v1/me/students` | 現在の講師に紐付く担当生徒 |

ログイン選択肢は全デモユーザー（代表・先生・スタッフ）を返し、ログインリクエストは次の形式である。

現在のSeedユーザーは、代表1人・先生2人・スタッフ2人である。生徒は5人で、先生2人に担当関係を分散している。

```json
{
  "userId": "00000000-0000-4000-8000-000000000001",
  "teacherId": "00000000-0000-0000-0000-000000000002",
  "password": "demo"
}
```

`userId` を正とし、旧クライアント向けに `teacherId` も移行期間だけ受け付ける。`users` と `user_roles` は1対1で、ロール値は `representative`、`teacher`、`staff` のいずれかである。

Cookie署名には `DEMO_SESSION_SECRET` を使用する。Cloudflare WorkersではSecretとして設定し、ローカル開発時だけ組み込みの開発用値へフォールバックする。

講師の担当生徒一覧は `teacher_student_assignments.is_active = true` の行だけを返す。`GET /students/:studentId`、`GET /lessons`、`GET /lessons/:lessonId` もログインユーザーの権限で参照範囲を制限する。代表は全件、先生は自分の担当範囲、スタッフはスケジュールのみ参照できる。レッスンの作成・更新・キャンセルも同じ認可方針に従う。

### 5.2 ヘルスチェック

#### `GET /api/v1/healthz`

Worker/APIの稼働確認に使用する。DB接続は確認しないため、DB障害時もAPIランタイムの生存確認として利用できる。

レスポンス例：

```json
{
  "status": "ok"
}
```

#### `GET /api/v1/readyz`

DB接続を含む準備状態の確認に使用する。DBへ `select 1` を実行し、接続できない場合はHTTP 500を返す。デプロイ後確認や監視のreadiness checkに利用する。

レスポンス例：

```json
{
  "status": "ready"
}
```

### 5.3 講師一覧

#### `GET /api/v1/teachers`

レッスン登録・検索・集計画面で利用する。MVPでは有効な講師を返す。

クエリパラメータ：

| パラメータ | 型 | 説明 |
| --- | --- | --- |
| `q` | string | 氏名・メールアドレスの部分一致 |
| `active` | boolean | 有効状態。省略時は `true` |
| `page` / `pageSize` | integer | 共通ページング |

レスポンス例：

```json
{
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "displayName": "田中 愛子",
      "email": "aiko@example.test",
      "employmentStartDate": "2024-04-01",
      "employmentEndDate": null,
      "isActive": true,
      "createdAt": "2026-11-18T03:00:00.000Z",
      "updatedAt": "2026-11-18T03:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

講師のCRUD API。講師には言語情報を持たせず、`employment_start_date` を勤務開始日、`employment_end_date` を勤務終了日として管理する。勤務終了日が未設定の場合は在職、設定済みの場合は退職として表示する。在籍期間は両日付からフロントエンドで計算する。

講師のCRUD API：

- `GET /api/v1/teachers/:teacherId`：詳細取得
- `POST /api/v1/teachers`：登録。`displayName`、`email`、`employmentStartDate`、任意の `employmentEndDate` を受け取る
- `PATCH /api/v1/teachers/:teacherId`：指定項目を部分更新
- `DELETE /api/v1/teachers/:teacherId`：`isActive=false` にする論理削除

メールアドレスは一意で、重複時は409を返す。講師がレッスンから参照されるため、削除時に物理削除は行わない。

### 5.4 生徒一覧

#### `GET /api/v1/students`

レッスン登録時の生徒選択とレッスン検索に利用する。

クエリパラメータ：`q`、`active`、`page`、`pageSize`。

レスポンス例：

```json
{
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "displayName": "王 小明",
      "email": "wang.xiaoming@example.test",
      "level": "beginner",
      "isActive": true,
      "createdAt": "2026-11-18T03:00:00.000Z",
      "updatedAt": "2026-11-18T03:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5.5 生徒詳細

#### `GET /api/v1/students/:studentId`

生徒IDに一致する生徒を返す。存在しないIDは `RESOURCE_NOT_FOUND` として404を返す。

### 5.6 生徒登録

#### `POST /api/v1/students`

リクエスト例：

```json
{
  "displayName": "王 小明",
  "email": "xiaoming@example.test",
  "level": "beginner"
}
```

メールアドレスはテーブルの一意制約により重複不可で、重複時は409を返す。登録日時はレスポンスの`createdAt`で返し、受講歴の表示用年数・月数はフロントエンドで計算する。

### 5.7 生徒更新

#### `PATCH /api/v1/students/:studentId`

指定した項目だけを更新する。`displayName`、`email`、`level`、`classId`、`isActive` を更新できる。空のリクエストは400、存在しないIDは404、メール重複は409を返す。

```json
{
  "level": "intermediate",
  "isActive": true
}
```

### 5.8 生徒削除

#### `DELETE /api/v1/students/:studentId`

レッスン履歴から参照される可能性があるため物理削除は行わず、`isActive=false` に更新する論理削除とする。成功時は204、存在しないIDは404を返す。

### 5.9 レッスン一覧・検索

#### `GET /api/v1/lessons`

レッスン管理画面の主API。タイトル検索、`status`、期間、講師、生徒、並び替え、ページングで検索できる。講師・生徒の絞り込みは中間テーブルを参照する。

クエリパラメータ：

| パラメータ | 型 | 必須 | 説明 |
| --- | --- | :---: | --- |
| `status` | enum |  | `scheduled`, `completed`, `absent`, `cancelled`。実装済み |
| `q` | string |  | 授業タイトルの部分一致検索 |
| `from` / `to` | ISO datetime |  | 開始日時の範囲 |
| `teacherId` / `studentId` | UUID |  | 中間テーブル経由の絞り込み |
| `sortBy` | enum |  | `scheduledStart`、`title`、`status` |
| `sortOrder` | enum |  | `asc`または`desc`。デフォルトは`desc` |
| `page` / `pageSize` | integer |  | 1始まり。`pageSize` は1〜100 |

レスポンス例：

```json
{
  "data": [
    {
      "id": "lesson_001",
      "teacherIds": ["00000000-0000-0000-0000-000000000002"],
      "studentIds": ["00000000-0000-0000-0000-000000000003"],
      "teacherId": "00000000-0000-0000-0000-000000000002",
      "studentId": "00000000-0000-0000-0000-000000000003",
      "scheduledStart": "2026-11-18T01:00:00.000Z",
      "scheduledEnd": "2026-11-18T02:00:00.000Z",
      "status": "scheduled",
      "record": null,
      "createdAt": "2026-11-01T03:00:00.000Z",
      "updatedAt": "2026-11-01T03:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 5.10 レッスン登録

#### `POST /api/v1/lessons`

リクエスト例：

```json
{
  "teacherIds": ["00000000-0000-0000-0000-000000000002"],
  "studentIds": ["00000000-0000-0000-0000-000000000003"],
  "scheduledStart": "2026-11-20T01:00:00.000Z",
  "scheduledEnd": "2026-11-20T02:00:00.000Z",
  "note": "初級会話"
}
```

入力ルール：

- `teacherIds` と `studentIds` は1件以上必須で、すべて存在し、かつ有効であること
- 移行期間中は単一の `teacherId` / `studentId` も受け付ける
- `scheduledStart` は `scheduledEnd` より前であること
- 授業時間は15分以上、180分以下
- 講師の同一時間帯のレッスンは登録不可
- 作成時の `status` は常に `scheduled`。クライアントから変更させない

成功時はHTTP 201で、作成したレッスンを `data` に返す。

### 5.11 レッスン詳細（実装済み）

#### `GET /api/v1/lessons/:lessonId`

一覧より詳細な講師・生徒情報と授業実績を返す。存在しないIDは404 `RESOURCE_NOT_FOUND`。

### 5.12 レッスン予定の編集（実装済み）

#### `PATCH /api/v1/lessons/:lessonId`

予定日時、講師、生徒を編集する。授業実績が登録済みの場合、日時変更は原則不可とする。

リクエスト例：

```json
{
  "teacherIds": ["00000000-0000-0000-0000-000000000002"],
  "studentIds": ["00000000-0000-0000-0000-000000000003"],
  "scheduledStart": "2026-11-20T01:30:00.000Z",
  "scheduledEnd": "2026-11-20T02:30:00.000Z",
}
```

`teacherIds` の先頭を主担当、それ以降を補助担当として `lesson_teachers.role` に保存する。`teacherId` / `studentId` は移行完了までレスポンスに残す互換フィールドである。

状態そのものはこのエンドポイントで直接変更しない。キャンセルは削除相当の `DELETE`、実施・欠席は次の授業実績APIに集約する。

現行実装では `scheduled` のレッスンだけを更新できる。講師・生徒の変更時は、有効なマスタを参照していることを確認する。

### 5.13 レッスン削除（キャンセル）

#### `DELETE /api/v1/lessons/:lessonId`

レッスン履歴を保持するため物理削除は行わず、`scheduled` のレッスンを `cancelled` に更新する。`completed`、`absent`、`cancelled` のレッスンは409を返す。

成功時はHTTP 204を返す。

### 5.14 授業実績の登録・更新

#### `GET /api/v1/lessons/:lessonId/record`

授業記録を取得する。ログイン中の講師がレッスン参加者でない場合は403、記録が未登録の場合は404を返す。

#### `POST /api/v1/lessons/:lessonId/record`

レッスンの実施結果を登録する。MVPでは1レッスンにつき1実績とし、既存実績の二重登録は409で拒否する。取得・更新・削除は同じパスに対するGET/PATCH/DELETEで提供する。

リクエスト例（実施）：

```json
{
  "outcome": "completed",
  "actualStart": "2026-11-20T01:02:00.000Z",
  "actualEnd": "2026-11-20T02:00:00.000Z",
  "note": "会話練習を実施"
}
```

リクエスト例（欠席）：

```json
{
  "outcome": "absent",
  "note": "生徒欠席"
}
```

リクエスト例（キャンセル）：

```json
{
  "outcome": "cancelled",
  "note": "前日キャンセル"
}
```

入力ルール：

- `outcome` は `completed`、`absent`、`cancelled` のいずれか
- `completed` の場合は `actualStart` と `actualEnd` を必須とする
- 実績時間は0分より長く、予定時間の前後を大きく超えないよう検証する
- `absent` と `cancelled` の場合、実施時間は集計しない
- 状態変更と実績登録を同一API処理で行う
- `completed` の登録時は、参加生徒を確定し、支払い済みで残り回数のある支払い記録から生徒ごとに1回消化する
- 対象生徒に利用可能な支払い記録がない場合は `409 PAYMENT_REQUIRED` とし、記録・完了状態・消化をすべて行わない
- 完了済みレッスンの記録削除・未完了状態への変更は、支払い消化との不整合を防ぐため拒否する

成功時はHTTP 201で、授業記録を返す。`absent` と `cancelled` では `actualStart` / `actualEnd` は `null` になる。

#### `PATCH /api/v1/lessons/:lessonId/record`

授業メモ、次回内容、実施日時、結果を訂正する。1レッスン1件の制約を維持したまま既存行を更新する。

#### `DELETE /api/v1/lessons/:lessonId/record`

`absent` / `cancelled` の記録だけ削除でき、レッスン状態を `scheduled` に戻す。`completed` の記録は支払い消化済みのため削除できない。

```json
{
  "data": {
    "lessonId": "lesson_001",
    "status": "completed",
    "record": {
      "id": "record_001",
      "outcome": "completed",
      "actualStart": "2026-11-20T01:02:00.000Z",
      "actualEnd": "2026-11-20T02:00:00.000Z",
      "durationMinutes": 58,
      "note": "会話練習を実施",
      "recordedAt": "2026-11-20T02:05:00.000Z"
    }
  }
}
```

### 5.15 講師別月間実績

#### `GET /api/v1/reports/teacher-monthly`

講師実績画面の集計API。集計はAPIサーバーで全件取得して計算せず、PostgreSQLの `GROUP BY` で実行する。

クエリパラメータ：

| パラメータ | 型 | 必須 | 説明 |
| --- | --- | :---: | --- |
| `month` | `YYYY-MM` | ○ | 集計対象月 |
| `teacherId` | string |  | 特定講師のみ |
| `includeZero` | boolean |  | 0件の講師も含める。初期値 `true` |

レスポンス例：

```json
{
  "data": {
    "month": "2026-11",
    "items": [
      {
        "teacher": {
          "id": "teacher_001",
          "name": "山田 花子"
        },
        "lessonCount": 20,
        "completedCount": 16,
        "absentCount": 2,
        "cancelledCount": 2,
        "completedMinutes": 960,
        "completionRate": 80
      }
    ],
    "totals": {
      "lessonCount": 20,
      "completedCount": 16,
      "absentCount": 2,
      "cancelledCount": 2,
      "completedMinutes": 960
    }
  }
}
```

集計ルール：

- `lessonCount` は対象月に予定されたレッスン数
- `completedCount` は `status=completed` の件数
- `absentCount` は `status=absent` の件数
- `cancelledCount` は `status=cancelled` の件数
- `completedMinutes` は実績の `actualStart`〜`actualEnd` の合計
- `completionRate` は `completedCount / lessonCount * 100`。0件の場合は `0`

## 6. レッスン状態遷移

状態は `lessons.status` に保存し、許可されない遷移はAPIで拒否する。

```text
scheduled ── completed
    │
    ├─────── absent
    │
    └─────── cancelled
```

MVPの状態遷移ルール：

| 現在 | 次の状態 | 方法 |
| --- | --- | --- |
| `scheduled` | `completed` | 授業実績API。実施時間必須 |
| `scheduled` | `absent` | 授業実績API |
| `scheduled` | `cancelled` | 授業実績API |
| `completed` | 変更不可 | 将来、管理者による訂正APIを検討 |
| `absent` | 変更不可 | 将来、管理者による訂正APIを検討 |
| `cancelled` | 変更不可 | 将来、再予約APIを検討 |

## 7. DBとの責務分担

APIの入力検証だけに依存せず、データベースにも整合性を持たせる。

### 想定テーブル

| テーブル | 主な役割 |
| --- | --- |
| `teachers` | 講師の基本情報と有効状態 |
| `students` | 生徒の基本情報と有効状態 |
| `lessons` | 予定日時、講師、生徒、現在状態 |
| `lesson_records` | 実施・欠席・キャンセルの結果 |

### 制約・インデックス

- 全テーブルにUUIDまたは衝突しない文字列ID、`created_at`、`updated_at` を持つ
- `lessons.teacher_id` と `lessons.student_id` は外部キー
- `lesson_records.lesson_id` は一意制約。1レッスン1実績を保証する
- `scheduled_start < scheduled_end` をDBのCHECK制約で保証する
- `actual_start` と `actual_end` は、実施時のみNULL不可になるようAPIとDBで検証する
- `lessons(scheduled_start)` にインデックスを作成する
- `lessons(teacher_id, scheduled_start)` に複合インデックスを作成する
- `lessons(status, scheduled_start)` に一覧・集計用インデックスを作成する

講師の時間重複は、単純な一意制約では表現しにくいため、APIのトランザクション内で確認する。将来的にはPostgreSQLの範囲型と排他制約の採用を検討する。

## 8. Honoの実装構成

```text
api/
├── src/
│   ├── index.ts                 Honoアプリのエントリーポイント
│   ├── app.ts                   ミドルウェアとルートの組み立て
│   ├── routes/
│   │   ├── docs.ts              OpenAPI JSON / Swagger UI
│   │   └── system.ts            healthz / readyz
│   ├── features/
│   │   ├── teachers/{routes,schema,service}.ts
│   │   ├── students/{routes,schema,service}.ts
│   │   └── lessons/{routes,schema,service}.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   └── shared/
│       └── errors.ts             エラーコードと変換
└── tests/
    ├── lessons.test.ts
    └── reports.test.ts
```

ルート層はHTTPの入出力とZod検証に集中させ、状態遷移・重複確認・集計などの業務ルールは `services` に置く。これにより、APIルートのテストと業務ロジックのユニットテストを分離できる。

## 9. フロントエンドからの利用例

Vue側ではAPIクライアントを画面ごとに直接散在させず、`web/src/api/` に集約する。

```text
web/src/api/
├── client.ts
├── teachers.ts
├── students.ts
├── lessons.ts
└── reports.ts
```

画面とAPIの対応は次のとおり。

| 画面 | 利用API |
| --- | --- |
| レッスン一覧 | `GET /lessons`、`GET /teachers`、`GET /students` |
| レッスン登録 | `GET /teachers`、`GET /students`、`POST /lessons` |
| レッスン詳細 | `GET /lessons/:lessonId`、`PATCH /lessons/:lessonId` |
| 授業実績登録 | `POST /lessons/:lessonId/record` |
| 講師実績 | `GET /reports/teacher-monthly` |

サーバーから取得したデータはVue Queryを使う場合はQuery Cacheに保持し、Piniaには画面横断の選択条件やUI状態だけを置く。Vue Queryを導入しない場合も、APIレスポンスをPiniaへ無制限に複製しない。

## 10. CORS・公開デモ・セキュリティ

応募用MVPはデモ認証を使用する。公開APIを無制限の書き込み可能にしない。

実装候補：

- デモログインは講師選択式で、パスワードを検証しない
- `DEMO_SESSION_SECRET` はCloudflare Workers Secretとして管理する
- 講師は担当生徒・参加レッスンの範囲だけ参照・更新できる
- `representative` は全件操作できる
- `teacher` は自分のレッスンを操作できる
- `staff` はスケジュールを閲覧できるが、レッスン記録を操作できない
- デモ専用DBを使い、書き込み対象を架空データだけに限定する
- `POST` / `PATCH` にレート制限を設ける
- 本番では認証、ロールによる認可、CSRF対策、監査ログを追加する
- エラー・ログ・レスポンスに実在する個人情報や決済情報を含めない

## 11. テスト項目

応募用MVPでは、次の業務ルールを優先してテストする。

自動テストは `api/tests/` にVitestで配置し、DB接続を必要としないHTTP契約・認証署名・Zodスキーマから開始する。DBを使うサービス統合テストは、Neonのテスト用ブランチまたはローカルPostgreSQLを用意した後に追加する。

```bash
pnpm --dir api test
```

- 正常なレッスン登録ができる
- 存在しない講師・生徒を指定すると404になる
- 開始日時が終了日時以降の場合に400になる
- 講師の時間帯重複を409で拒否できる
- `scheduled` から `completed` / `absent` / `cancelled` に遷移できる
- 完了記録では実績時間が保存される
- 欠席・キャンセルは実施時間に加算されない
- 完了済みレッスンへの不正な再登録を409で拒否できる
- 月間集計の件数・分数・完了率が正しい
- データ0件の月でも空の集計結果を正常に返せる

現在の自動テスト（20件）：

- `api/tests/api.test.ts`：healthz、404、未認証APIの401
- `api/tests/auth-session.test.ts`：セッションCookieの署名・改ざん検知
- `api/tests/lesson-schemas.test.ts`：複数参加者、日時、授業記録の入力検証と正規化

## 12. 実装順序

1. `teachers`、`students`、`lessons`、`lesson_records` のDrizzle schemaとMigration（完了）
2. Seedデータと `GET /healthz` / `GET /readyz`（完了）
3. 講師・生徒CRUD（完了）
4. レッスン登録・一覧API（完了）
5. レッスン詳細・更新API（完了）
6. デモ認証・講師別認可（完了）
7. 授業実績APIと状態遷移（完了）
8. 講師別月間集計API、ページング、テスト（次段階）

OpenAPI仕様をAPI契約の正とし、フロントエンドではKubbから型付きFetchクライアントとTanStack Vue Query Composableを生成する。Hono RPCは採用せず、APIのOpenAPI定義からクライアントコードを一方向に生成する。

Cloudflare Workersへの公開構成、Secret、ローカルWorkers実行、デプロイ手順は [cloudflare-workers-deployment.md](./cloudflare-workers-deployment.md) にまとめる。

