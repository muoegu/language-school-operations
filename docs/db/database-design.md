# データベース設計書

## 1. 文書の目的

`docs/disco_vue_portfolio_spec.md` と `docs/web/frontend-architecture.md` に定義した、語学学校向け業務管理システムの応募用MVPにおける PostgreSQL のデータ構成を定義する。

対象範囲は、レッスン予定の登録・検索、授業実績の記録、講師別・月別の実績集計である。将来の講師・スタッフログインと複数講師・複数生徒のレッスンに対応できる目標構成も定義する。詳細な関連図は [テーブル関連図](./table-relationships.md) を参照する。

## 2. 設計方針

| 項目 | 方針 |
| --- | --- |
| DBMS | PostgreSQL |
| ORM / Migration | Drizzle ORM / drizzle-kit |
| 主キー | UUID。アプリケーション側またはDB側で生成する |
| 時刻 | `timestamptz` を使用し、保存はUTC、表示は `Asia/Taipei` を基本とする |
| 状態 | `lessons.status` はAPI・DBで定義値を検証する |
| 論理削除 | `teachers` と `students` は `is_active = false` とする。講師の勤務終了日は `employment_end_date` に記録する。`lessons` は物理削除せず、状態更新で扱う |
| 個人情報 | すべて架空のSeedデータを使用し、実在の生徒・講師情報を登録しない |
| 認証 | `users` / `user_roles` を利用したデモログインを実装済み。1ユーザー1ロール。本番認証は後でBetter Auth等へ置換する |

### 2.1 MVPで保証する業務ルール

1. 1件のレッスンには、1人以上の講師と1人以上の生徒を紐付ける。
2. レッスンの終了日時は開始日時より後でなければならない。
3. `completed` のレッスンには授業実績を登録し、実施開始・終了日時を必須とする。
4. `scheduled` のレッスンに授業実績を登録し、記録登録と同時に状態を更新する。
5. `absent` または `cancelled` のレッスンでは、実施時間を集計しない。
6. 1件のレッスンに対して授業実績は最大1件とする。
7. 過去のレッスン、講師、生徒を物理削除せず、講師・生徒は `is_active = false`、レッスンは状態更新で扱う。監査ログ自体は将来拡張とする。

## 3. 現行実装のER図

下図の直接FKは互換期間中のレガシー構成である。現在のAPIは中間テーブルを正として参照する。目標構成の図は [テーブル関連図](./table-relationships.md) に掲載している。

```mermaid
erDiagram
    teachers ||--o{ lessons : teaches
    students ||--o{ lessons : attends
    lessons ||--o| lesson_records : has

    teachers {
        uuid id PK
        varchar display_name
        varchar email UK
        date employment_start_date
        date employment_end_date
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    students {
        uuid id PK
        varchar display_name
        varchar email UK
        varchar level
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    lessons {
        uuid id PK
        uuid teacher_id FK
        uuid student_id FK
        varchar title
        varchar level
        timestamptz scheduled_start_at
        timestamptz scheduled_end_at
        lesson_status status
        text status_reason
        timestamptz created_at
        timestamptz updated_at
    }

    lesson_records {
        uuid id PK
        uuid lesson_id FK_UK
        timestamptz actual_start_at
        timestamptz actual_end_at
        text note
        timestamptz created_at
        timestamptz updated_at
    }
```

## 3.1 目標構成の要点

目標構成では、`lessons.teacher_id` と `lessons.student_id` を直接参照せず、次の中間テーブルへ移行する。

- `lesson_teachers`：レッスンと講師の多対多関係
- `lesson_students`：レッスンと生徒の多対多関係
- `teacher_student_assignments`：講師の担当生徒と担当期間
- `users` / `user_roles`：ログイン主体と権限
- `staff_members`：スタッフの業務プロフィール
- `classes`：クラス名・レベル・時間・料金のマスタ。授業予定とは別の概念
- `textbooks`：教科書名・出版社・価格・販売状態のマスタ
- `payment_records`：5レッスン分と教科書代を合算した生徒ごとの支払い記録
- `payment_record_textbooks`：支払い記録と教科書の中間テーブル
- `payment_record_lessons`：支払い記録と利用レッスンの中間テーブル

授業メモと次回内容は、当面 `lesson_records` にレッスン単位で保存し、個別生徒用の記録テーブルは追加しない。

### 3.2 実装済みの移行基盤

`api/drizzle/0001_simple_doctor_strange.sql` と `api/drizzle/0002_nervous_fabian_cortez.sql` で、次のテーブルとカラムを追加している。

- `users`、`user_roles`、`staff_members`
- `teachers.user_id`
- `teacher_student_assignments`
- `lesson_teachers`、`lesson_students`
- `lesson_records.next_content`
- `lesson_types`、`textbooks`
- `lessons.class_id`、`payment_records.class_id`
- `lesson_records.actual_start_at` / `actual_end_at` のNULL許可（欠席・キャンセル対応）
- `user_roles.user_id` の一意制約（1ユーザー1ロール）

`0001` は既存の `lessons` を読み取り、単一の `teacher_id` / `student_id` を中間テーブルへ登録する。`0002` は欠席・キャンセルの実績で実施日時をNULLにできるようにする。`0003` は `admin` を `representative` へ移行し、重複ロールを整理したうえで1ユーザー1ロールをDB制約で保証する。旧カラムはAPI切り替え完了まで残す。

### 3.3 クリーンSeed

開発用の `db:reset` はアプリケーションテーブルを全削除してから、次の架空データを再投入する。実行前に既存データを削除するため、共有環境では使用しない。

- ユーザー：代表1、講師2、スタッフ2
- 講師：2
- 生徒：5
- 講師・生徒の担当割当：5
- レッスン：5件（すべて完了済み）
- 授業記録：5件（メモ・次回内容あり）

Seedの表示データは日本語で統一する。メールアドレスはデモログインで識別するための架空の内部値として英字を維持し、ロール・ステータス・通貨コードなどの固定値はAPI契約上の英語値を維持する。

### 3.4 データの一括クリアと再投入

開発用データを作り直す場合は、次のコマンドでアプリケーションテーブルを全消去し、日本語のSeedを再投入する。

```bash
pnpm --dir api db:reset
```

この処理は、支払い記録・教材紐付け・レッスン実績・出勤記録・ユーザー・生徒・講師・スタッフ・教科書・クラスをまとめて削除してから、Seedを投入する。`drizzle.__drizzle_migrations`などのMigration管理テーブルは削除しない。

接続先は`DATABASE_URL_UNPOOLED`、なければ`DATABASE_URL`を使用する。共有環境・本番環境では実行せず、必要な場合はNeonのブランチを作成してから実行する。

## 4. テーブル定義

### 4.1 `teachers`

講師の基本情報を保持する。レッスン履歴から参照されるため、在籍終了後も既存レッスンの表示が壊れないよう、削除ではなく `is_active = false` で非表示にする。

| カラム | 型 | NULL | 制約・説明 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | PK。`gen_random_uuid()` を使用 |
| `display_name` | `varchar(100)` | NO | 表示名。空文字は禁止 |
| `email` | `varchar(255)` | YES | 任意。登録する場合は小文字で保持し一意 |
| `locale` | `varchar(10)` | NO | `ja` または `zh-TW`。デフォルト `ja` |
| `is_active` | `boolean` | NO | デフォルト `true` |
| `created_at` | `timestamptz` | NO | デフォルト `now()` |
| `updated_at` | `timestamptz` | NO | 更新時に更新 |

### 4.2 `students`

レッスンを受講する生徒の基本情報を保持する。詳細なカラム定義、制約、CRUD方針、検索、Seed、Migrationは [studentsテーブル仕様書](./students-table-spec.md) で管理する。

### 4.3 `lessons`

レッスンの予定と現在の業務状態を保持する。詳細なカラム定義、状態遷移、集計ルールは [lessonsテーブル仕様書](./lessons-table-spec.md) を参照する。

### 4.4 `lesson_records`

レッスンの実施結果を保持する。詳細なカラム定義、登録ルール、更新・訂正方針は [lesson_recordsテーブル仕様書](./lesson-records-table-spec.md) を参照する。

### 4.5 `lesson_types` / `textbooks`

画面の料金表・教科書一覧に表示する最小限のマスタを保持する。カラム定義とSeedの詳細は [支払い記録向けスキーマ仕様書](./payment-materials-schema-spec.md) を参照する。請求書・入金テーブルはまだ作成せず、次段階で追加する。

### 4.6 支払い記録

`payment_records` は1件あたり5レッスン固定で、レッスン料金5回分と紐付く複数教科書の価格を合算する。残り回数は `payment_record_lessons` の利用件数から算出する。詳細は [支払い記録向けスキーマ仕様書](./payment-materials-schema-spec.md) を参照する。

## 5. 制約と整合性

削除・無効化・関連データがある場合のAPIエラーとトースト表示方針は [削除・無効化ポリシー](./deletion-policy.md) を参照する。

### 5.1 DBで設定する制約

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE lesson_status AS ENUM (
  'scheduled',
  'completed',
  'absent',
  'cancelled'
);

ALTER TABLE lessons
  ADD CONSTRAINT lessons_scheduled_time_order
  CHECK (scheduled_end_at > scheduled_start_at);

ALTER TABLE lesson_records
  ADD CONSTRAINT lesson_records_actual_time_order
  CHECK (actual_end_at > actual_start_at);

ALTER TABLE lesson_records
  ADD CONSTRAINT lesson_records_lesson_id_unique
  UNIQUE (lesson_id);
```

`completed` と `lesson_records` の存在関係は、単純な `CHECK` 制約では別テーブルを参照できないため、APIのトランザクションまたはDBトリガーで保証する。現状のMVP実装では、記録登録APIが状態更新と記録登録を同一処理内で実行している。厳密な原子性は次の改善課題である。

1. 対象レッスンをロックして現在状態を確認する（トランザクション化時）
2. 状態遷移が許可されているか確認する
3. `completed` の場合は実績の日時を検証して保存する
4. `lessons.status` と `updated_at` を更新する
5. いずれかが失敗した場合は全体をロールバックする

### 5.2 APIで設定する制約

- `display_name` は前後空白を除去し、空文字を拒否する。
- `email` は入力時に小文字化する。空文字は `NULL` として保存する。
- `completed` への更新には `actual_start_at` と `actual_end_at` を必須とする。
- `scheduled` から `absent` / `cancelled` への更新を許可する。
- `scheduled` から `completed` への更新を許可する。
- `completed` から `scheduled` への戻しは、MVPでは原則許可しない。訂正が必要な場合は専用の更新仕様を追加する。
- `absent` / `cancelled` から `completed` への変更は、誤登録訂正を想定してAPIで許可する。
- `status_reason` は `absent` / `cancelled` では任意、その他の状態では不要とする。必須化する場合はAPI仕様とUIを同時に変更する。

## 6. インデックス

```sql
CREATE INDEX lessons_scheduled_start_at_idx
  ON lessons (scheduled_start_at);

CREATE INDEX lessons_teacher_start_at_idx
  ON lessons (teacher_id, scheduled_start_at);

CREATE INDEX lessons_status_start_at_idx
  ON lessons (status, scheduled_start_at);

CREATE INDEX lessons_student_start_at_idx
  ON lessons (student_id, scheduled_start_at);

CREATE INDEX lesson_records_actual_start_at_idx
  ON lesson_records (actual_start_at);
```

用途は次のとおりである。

| インデックス | 主な用途 |
| --- | --- |
| `lessons_scheduled_start_at_idx` | レッスン一覧の日付・期間検索、直近レッスン |
| `lessons_teacher_start_at_idx` | 講師別のレッスン一覧・月次集計の絞り込み |
| `lessons_status_start_at_idx` | 状態別の一覧、未実施・未処理レッスン |
| `lessons_student_start_at_idx` | 生徒別の履歴検索 |
| `lesson_records_actual_start_at_idx` | 実施日時による集計・期間検索 |

期間検索では、開始日時を含み終了日時を含まない半開区間（`>= from` かつ `< to`）を使用する。これにより月末・日付境界の重複を避ける。

## 7. 月間実績集計

講師実績画面は、`lessons` と `lesson_records` を PostgreSQL 側で集計し、APIは集計済みの行を返す。フロントエンドでレッスン全件を再計算しない。

### 7.1 集計定義

| 項目 | 定義 |
| --- | --- |
| 授業件数 | 対象期間内の全レッスン数。状態を問わない |
| 実施件数 | `lessons.status = 'completed'` の件数 |
| 実施時間 | `completed` の `actual_end_at - actual_start_at` の合計 |
| 欠席件数 | `status = 'absent'` の件数 |
| キャンセル件数 | `status = 'cancelled'` の件数 |
| 集計月 | `lessons.scheduled_start_at` を `Asia/Taipei` に変換した月 |

### 7.2 集計SQL例

```sql
SELECT
  t.id AS teacher_id,
  t.display_name AS teacher_name,
  COUNT(l.id)::int AS lesson_count,
  COUNT(*) FILTER (WHERE l.status = 'completed')::int AS completed_count,
  COALESCE(
    SUM(EXTRACT(EPOCH FROM (lr.actual_end_at - lr.actual_start_at)))
      FILTER (WHERE l.status = 'completed'),
    0
  )::bigint AS completed_seconds,
  COUNT(*) FILTER (WHERE l.status = 'absent')::int AS absent_count,
  COUNT(*) FILTER (WHERE l.status = 'cancelled')::int AS cancelled_count
FROM teachers t
LEFT JOIN lessons l
  ON l.teacher_id = t.id
 AND l.scheduled_start_at >= $1
 AND l.scheduled_start_at < $2
LEFT JOIN lesson_records lr
  ON lr.lesson_id = l.id
WHERE t.is_active = true
GROUP BY t.id, t.display_name
ORDER BY t.display_name;
```

`$1` と `$2` は、対象月の `Asia/Taipei` における月初・翌月月初をUTCに変換した値をAPIが渡す。実施時間は秒で返し、画面表示時に時間・分へ変換する。

## 8. 状態更新トランザクション

レッスン詳細画面からの更新は、次の入力を1つのAPIリクエストで受け付ける。

```ts
type UpdateLessonInput = {
  status: 'scheduled' | 'completed' | 'absent' | 'cancelled'
  actualStartAt?: string
  actualEndAt?: string
  statusReason?: string
  note?: string
}
```

保存処理の概念は次のとおりである。

```text
BEGIN
  lessons を lesson_id で FOR UPDATE
  現在の状態と入力値から状態遷移を検証
  scheduled_end_at / actual_end_at の時刻順を検証

  status = completed の場合
    lesson_records を INSERT または UPDATE
  status != completed の場合
    既存 lesson_records があれば削除または無効化方針に従う

  lessons を UPDATE
COMMIT
```

MVPでは `completed` から別状態へ戻すケースを最小化するため、既存 `lesson_records` の削除を通常フローに含めない。将来、訂正フローを追加する場合は、レコードを削除するか、実績取消状態を持たせるかを別途決定する。

## 9. Seedデータ方針

Seedは画面確認と集計確認に必要な最小データを用意する。

| データ | 件数の目安 | 含める状態 |
| --- | ---: | --- |
| ユーザー | 5 | 代表1、先生2、スタッフ2。1ユーザー1ロール |
| 講師 | 2 | 先生2。代表・スタッフは講師マスタに登録しない |
| スタッフ | 2 | 全員 `is_active = true` |
| 生徒 | 5 | 複数のレベル・クラス設定 |
| レッスン | 5 | すべて `completed`。講師・生徒の担当関係を確認できる |
| 授業実績 | 5 | 実施時間、授業メモ、次回内容を含む |

Seedの条件：

- 氏名・メールアドレスは実在人物と無関係な架空値にする。
- 5件のレッスンは、画面・APIで授業一覧と記録詳細を確認するために使用する。
- `db:reset` の再実行で古いデータを残さず、常に同じマスタ・レッスン件数へ戻せるようにする。

`pnpm --dir api db:reset` はアプリケーションテーブルを全消去する破壊的な開発用コマンドである。Neonの共有・本番環境では実行しない。

## 10. Migrationの適用順

Migrationは次の順番で管理する。実際のファイル名は `drizzle-kit` の生成形式に従う。

### 10.1 現行MVPの初期Migration

1. `pgcrypto` 拡張と `lesson_status` enumを作成
2. `teachers` を作成
3. `students` を作成
4. `lessons` と外部キー・チェック制約を作成
5. `lesson_records` と一意制約・チェック制約を作成
6. 検索・集計用インデックスを作成
7. 架空のSeedデータを投入

### 10.2 複数参加者・ログイン対応への追加Migration

1. `users` と `user_roles` を作成（完了）
2. `staff_members` を作成し、必要なユーザーを紐付ける（完了）
3. `teachers.user_id` を追加し、ログイン可能な講師を紐付ける（完了）
4. `teacher_student_assignments` を作成する（完了）
5. `lesson_teachers` と `lesson_students` を作成する（完了）
6. 既存の `lessons.teacher_id` と `lessons.student_id` を中間テーブルへ移行する（完了）
7. APIを中間テーブル参照へ切り替える（完了）
8. `lesson_records` の授業記録CRUDとNULL実施日時を追加する（完了）
9. データ確認後に旧カラムを削除する（後続）

Migration適用後に確認する項目：

- `lessons.teacher_id` と `lessons.student_id` の外部キーが有効であること
- 開始より終了が前になる日時を登録できないこと
- 1レッスンに2件目の `lesson_records` を登録できないこと
- 欠席・キャンセルの `lesson_records` は実施日時NULLで登録できること
- 4種類の状態が登録できること
- 月次集計の結果がSeedデータの期待値と一致すること

## 11. 将来拡張

応募用MVPで無理に追加せず、必要性が出た場合に次のテーブルを検討する。

追加候補の詳細なスキーマ案と作成条件は [追加テーブル候補・スキーマ設計書](./future-tables-design.md) を参照する。支払い・教科書・レッスン料金の設計は [支払い記録向けスキーマ仕様書](./payment-materials-schema-spec.md) にまとめている。ここに記載したテーブルはまだ作成しない。

| テーブル候補 | 目的 | 追加時の注意 |
| --- | --- | --- |
| `staff_users` | ログイン・認証・権限管理 | パスワードを自前管理せず、認証方式を先に決める |
| `payments` | 受講料・支払い記録 | 金額は整数の最小通貨単位で保持し、レッスンと請求の関係を定義する |
| `attendance_records` | 社員の出退勤 | 授業実績とは業務概念が異なるため、`lesson_records` と統合しない |
| `leave_requests` | 休暇申請・承認 | 申請者、承認者、状態遷移、承認履歴が必要 |
| `audit_logs` | 操作履歴 | 誰が、いつ、何を変更したかをJSONまたは差分で保持する |
| `lesson_participants` | 複数生徒・グループレッスン | 現在の `lessons.student_id` を中間テーブルへ移行する必要がある |

## 12. MVPの非対象と注意事項

- この設計はポートフォリオ用の架空データを前提とする。
- 認証済みユーザーの権限なしに書き込みAPIを無制限に公開しない。
- 実在の学校・生徒・講師・決済情報をSeedや公開DBに投入しない。
- DBの制約だけに依存せず、APIの入力検証・状態遷移検証も実装する。
- `lesson_status` を日本語や繁体字中国語で保存せず、内部値は英語の固定値、表示名はi18n辞書で管理する。
- PostgreSQLのタイムゾーン設定とAPIの日時変換を統一し、画面・集計・Seedで日付がずれないようにする。
