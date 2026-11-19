# `lesson_records` テーブル仕様書

## 1. 目的

レッスンの実施結果を管理する。予定日時とは別に実際の開始・終了日時を持ち、遅刻・延長・短縮を記録できるようにする。授業メモと次回内容は、まずレッスン全体に対して保存する。

## 2. テーブル概要

| 項目 | 内容 |
| --- | --- |
| テーブル名 | `lesson_records` |
| 主キー | `id`（UUID） |
| 親テーブル | `lessons` |
| 関係 | 1レッスンに0または1件 |
| 削除方針 | 親レッスン削除時のみCASCADE。通常はレッスンを削除しない |

## 3. カラム定義

| カラム | PostgreSQL型 | NULL | デフォルト | 制約・用途 |
| --- | --- | :---: | --- | --- |
| `id` | `uuid` | NO | `gen_random_uuid()` | 主キー |
| `lesson_id` | `uuid` | NO | なし | `lessons.id` へのFK。UNIQUE。削除時 `CASCADE` |
| `recorded_by_user_id` | `uuid` | YES | `NULL` | 記録を登録したログインユーザー。`users.id` へのFK |
| `completed_at` | `timestamptz` | YES | `NULL` | `completed` になった日時 |
| `actual_start_at` | `timestamptz` | YES | `NULL` | 実施開始日時。欠席・キャンセルではNULL |
| `actual_end_at` | `timestamptz` | YES | `NULL` | 実施終了日時。欠席・キャンセルではNULL |
| `note` | `text` | YES | `NULL` | 授業メモ・申し送り。個人情報を書きすぎない |
| `next_content` | `text` | YES | `NULL` | 次回の授業内容。レッスン全体に共通する内容 |
| `created_at` | `timestamptz` | NO | `now()` | 登録日時 |
| `updated_at` | `timestamptz` | NO | `now()` | 最終更新日時 |

## 4. DB制約・インデックス

- `lesson_id` は一意。1レッスンに実績を2件登録できない。
- `actual_end_at > actual_start_at`。
- `lesson_id` は `lessons.id` を参照する。
- `actual_start_at` に実施期間検索用インデックスを作成する。

## 5. 登録ルール

- `lessons.status = completed` のときに実績を必須とする。
- `scheduled` のレッスンに対して登録する。`absent`、`cancelled` は実施日時をNULLとして記録する。
- `completed` の記録登録時は、記録者、参加生徒、利用支払い記録を確定する。
- 状態変更、実績登録、参加状態更新、支払い記録の消化は同じDBバッチで処理する。
- 実績登録後にレッスン状態だけを変更して不整合を作らない。
- 実施時間は `actual_end_at - actual_start_at` で算出する。

## 6. 更新・訂正ルール

- 同じ `lesson_id` に対する登録は409とし、訂正はPATCHで行う。
- GET/PATCH/DELETEはレッスン参加者の講師、スタッフ、管理者だけが実行できる。
- 実績の開始・終了日時を変更した場合、`updated_at` を更新する。
- `completed` から別状態へ戻すことは、支払い記録を消費済みとしているため禁止する。
- `completed` の記録削除は、支払い記録との不整合を避けるため禁止する。
- `absent` / `cancelled` の記録は、代表権限による訂正フローを将来追加する。

## 7. 集計上の扱い

`lesson_records` 単体では実施件数を判定せず、`lessons.status = completed` とJOINして集計する。これにより、誤って残った実績レコードを実施済みとして数えない。
