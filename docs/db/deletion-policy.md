# 削除・無効化ポリシー

## 1. 目的

生徒、講師、教材、レッスン、支払い記録などの関連データを壊さず、安全に削除操作を扱うためのDB・API・フロントエンド共通方針を定義する。

特に、物理削除を行わない場合でも、画面上の削除操作によって履歴や請求情報が見えなくなることがあるため、単に `is_active = false` や `status = discontinued` に更新するだけでは十分とはみなさない。

## 2. 基本方針

### 2.1 削除と無効化を分ける

| 操作 | 意味 | 対象 |
| --- | --- | --- |
| 物理削除 | DB行を削除する | 原則として業務データには提供しない |
| 無効化・終了 | 新規選択・新規登録の候補から外す | 生徒、講師、教材、レッスン種別 |
| キャンセル | 予定や申請を取り消す | レッスン、支払い記録 |
| 削除拒否 | 関連履歴があるため操作を完了させない | 履歴・請求に影響するマスタ |

「削除」ボタンがあっても、実際の処理は対象によって異なる。関連データがある場合は、APIが削除・無効化を拒否し、フロントエンドは理由をトーストで表示する。

### 2.2 APIを最終判定とする

- フロントエンドで関連件数を確認しても、削除可否の最終判定には使わない。
- APIは削除処理と依存データ確認を同一トランザクション、または一貫したDB状態で行う。
- 関連データがある場合は `409 Conflict` を返す。
- DBの外部キー制約は最後の安全網として残す。
- APIエラーの文言をフロントエンドで直接表示せず、安定したエラーコードをi18nキーへ変換する。

## 3. 削除可否マトリクス

### 3.1 現在存在するテーブル

| 対象 | 関連するデータ | 関連がある場合 | 通常のAPI操作 | 方針 |
| --- | --- | --- | --- | --- |
| `students` | `lessons`、`lesson_students`、`teacher_student_assignments`、`payment_records` | 削除拒否 | `DELETE` は無効化相当 | 履歴・支払いがある生徒は削除不可。必要なら非表示・退会状態を別途追加 |
| `teachers` | `lessons`、`lesson_teachers`、`teacher_student_assignments` | 削除拒否 | `DELETE` は無効化相当 | 授業履歴がある講師は削除不可。`is_active = false` を別操作として扱う |
| `lesson_types` | `lessons.lesson_type_id`、`payment_records.lesson_type_id` | 削除拒否 | `DELETE` は無効化 | 料金・履歴に影響するため、`is_active = false` のみ許可 |
| `textbooks` | `payment_record_textbooks` | 削除拒否 | `DELETE` は取扱終了 | 購入記録の教材名・価格を壊さない。`status = discontinued` にする |
| `lessons` | `lesson_records`、`lesson_teachers`、`lesson_students`、`payment_record_lessons` | 原則削除拒否 | `DELETE` はキャンセル | 支払い・実施・参加履歴がある予定を削除しない。予定の取消は状態変更 |
| `lesson_records` | `payment_record_lessons`、レッスンの実施状態 | 関連があれば削除拒否 | `DELETE` は訂正操作 | 支払い消化済みの実績を削除すると請求状態と不一致になるため、訂正フローを分ける |
| `payment_records` | `payment_record_textbooks`、`payment_record_lessons` | 物理削除禁止 | `DELETE` はキャンセル | 金銭・購入履歴なので `status = cancelled` とし、リンクと履歴を保持 |
| `teacher_student_assignments` | `lessons` への影響 | 原則削除拒否 | `ended_at` 更新または無効化 | 過去の担当関係を残し、現在の割当だけ終了する |
| `users` | `user_roles`、`teachers.user_id`、`staff_members.user_id`、将来の監査ログ | 物理削除禁止 | 無効化・セッション失効 | 操作者・認証履歴を壊さない。認証プロバイダ側の削除も別途扱う |
| `user_roles` | ユーザーの権限 | 直接削除可否を限定 | 権限変更 | 最後の代表者権限を削除しないなどの認可ルールが必要 |

### 3.2 将来追加するテーブル

| 対象 | 関連するデータ | 方針 |
| --- | --- | --- |
| `rooms` | `lessons.room_id` | 既存レッスンがあれば削除不可。利用停止のみ |
| `leave_requests` | `staff_users`、承認者、監査ログ | 申請・承認履歴は削除せず、取消状態にする |
| `audit_logs` | すべての操作主体・対象 | 追記のみ。物理削除APIを作らない |
| `student_enrollments` | `students`、`courses` | 終了日・退会状態で履歴を残す |

## 4. 特に注意が必要な関連

### 4.1 生徒と支払い記録

`payment_records.student_id` は生徒を参照する。生徒を削除・無効化した際に支払い記録を消したり、支払い記録から生徒を外したりしてはいけない。

- 生徒に支払い記録があれば、削除操作は拒否する。
- 生徒を一覧から隠す必要がある場合は、無効化・退会状態を使う。
- 支払い記録は `student_id`、金額、通貨、購入日時、状態を保持する。
- 支払い記録をキャンセルしても、通常は生徒・教材とのリンクを履歴として保持する。

### 4.2 教材と支払い記録

`payment_record_textbooks` は購入時の教材と価格スナップショットを保持する。

- 教材に購入記録があれば削除不可。
- 教材の現在価格を変更しても、`price_minor_snapshot` は変更しない。
- 販売を止める場合は `textbooks.status = discontinued` とする。
- フロントエンドの削除ボタンは、実質的には「取扱終了」と表示する方が誤解が少ない。

### 4.3 レッスンと支払い記録

`payment_record_lessons` は、どのレッスンを支払い記録で消化したかを示す。

- 支払い消化済みのレッスンは物理削除しない。
- 予定の取り消しが返金や振替に影響する場合、単純な `cancelled` 更新だけで完了させない。
- 返金・振替・消化取消を行う場合は、専用の業務フローと履歴テーブルを追加する。

### 4.4 レッスン実績と支払い記録

`lesson_records` の削除は、`lessons.status` と `payment_record_lessons` に影響する。

- 支払いで消化済みの実績は削除拒否する。
- 誤入力の訂正は、実績の上書き、訂正理由、訂正者を記録する方式を検討する。
- 実績を取り消す場合は、支払い消化の戻しを同じトランザクションで処理する。

## 5. API仕様

### 5.1 エラーコード

関連データがあるため削除できない場合は、次のエラーを返す。

```json
{
  "error": {
    "code": "RESOURCE_IN_USE",
    "message": "Resource cannot be deleted because related records exist",
    "details": {
      "resourceType": "textbooks",
      "resourceId": "00000000-0000-0000-0000-000000000001",
      "dependencies": [
        { "type": "payment_record_textbooks", "count": 2 }
      ]
    },
    "requestId": "00000000-0000-0000-0000-000000000002"
  }
}
```

`message` はログ・開発者向けの英語固定文でもよい。利用者向け表示は `code` と `details.dependencies[].type` を使ってフロントエンド側で翻訳する。

### 5.2 HTTPステータス

| 状況 | HTTP | code |
| --- | ---: | --- |
| 対象が存在しない | 404 | `RESOURCE_NOT_FOUND` |
| 関連データがあり削除不可 | 409 | `RESOURCE_IN_USE` |
| 状態上、削除・キャンセル不可 | 409 | `INVALID_STATUS_TRANSITION` |
| 権限不足 | 403 | `FORBIDDEN` |
| DB外部キーにより拒否 | 409 | `RESOURCE_IN_USE` に正規化 |

### 5.3 依存確認の実装方針

削除対象ごとに、APIサービスで依存件数を確認する。フロントエンドから複数の件数APIを呼び出して判定しない。

```text
BEGIN
  対象リソースをIDで取得・ロック
  関連テーブルを対象ごとにCOUNT
  依存件数が1件以上なら RESOURCE_IN_USE を返してROLLBACK
  依存がなければ無効化・終了・キャンセルを実行
COMMIT
```

依存件数を返すと、フロントエンドは「支払い記録が2件あるため削除できません」のような具体的なトーストを表示できる。

## 6. フロントエンド仕様

### 6.1 成功時

- APIが204を返した場合だけ削除モーダルを閉じる。
- 一覧を再取得する。
- `toast.deleteSuccess` を表示する。

### 6.2 `RESOURCE_IN_USE` 時

- 削除モーダルは閉じない。
- 一覧データは変更しない。
- `details.dependencies` を翻訳キーへ変換する。
- 関連があるため削除できないこと、必要なら無効化・取扱終了を使うことをトーストで表示する。

例：

```text
支払い記録があるため、この教材は削除できません。取扱終了にしてください。
```

### 6.3 その他のエラー

- `RESOURCE_NOT_FOUND`：対象がすでに変更・削除済みであることを表示し、一覧を再取得する。
- `INVALID_STATUS_TRANSITION`：現在の状態では操作できないことを表示する。
- 通信エラー：再試行を促す一般エラーを表示する。
- APIの英語 `message` をそのままトーストに出さない。

### 6.4 i18nキー案

```text
toast.deleteSuccess
toast.resourceInUse
toast.resourceInUseWithDependencies
deleteDependency.lessons
deleteDependency.lessonRecords
deleteDependency.paymentRecords
deleteDependency.paymentRecordTextbooks
deleteDependency.paymentRecordLessons
deleteDependency.assignments
deleteAlternative.deactivateStudent
deleteAlternative.deactivateTeacher
deleteAlternative.discontinueTextbook
```

日本語・繁体字中国語の両方を用意する。

## 7. DB外部キーの見直し方針

現在の `ON DELETE` は、親の物理削除が起きないことを前提に一部 `CASCADE` / `SET NULL` を使用している。今後、削除APIを実装する前に次を確認する。

| 外部キー | 現在の方針 | 推奨方針 |
| --- | --- | --- |
| `payment_records.student_id` | `RESTRICT` | 維持 |
| `payment_record_textbooks.textbook_id` | `RESTRICT` | 維持 |
| `payment_record_lessons.lesson_id` | `RESTRICT` | 維持 |
| `lessons.teacher_id` / `student_id` | `RESTRICT` | 維持 |
| `lessons.lesson_type_id` | `SET NULL` | APIで関連削除を拒否。物理削除を認めるなら `RESTRICT` へ変更 |
| `payment_records.lesson_type_id` | `SET NULL` | APIで関連削除を拒否。履歴保持を優先 |
| `lesson_records.lesson_id` | `CASCADE` | 物理削除を禁止するため通常は発火しない。より安全にするなら `RESTRICT` |
| `lesson_teachers.lesson_id` / `lesson_students.lesson_id` | `CASCADE` | 物理削除を禁止するため通常は発火しない。履歴重視なら `RESTRICT` |
| `payment_record_textbooks.payment_record_id` | `CASCADE` | 支払い記録を物理削除しないため通常は発火しない。原則 `RESTRICT` を検討 |
| `payment_record_lessons.payment_record_id` | `CASCADE` | 支払い記録を物理削除しないため通常は発火しない。原則 `RESTRICT` を検討 |

DB制約の変更は、既存データとMigrationの適用順を確認してから実施する。今回の設計検討では外部キーを変更しない。

## 8. 実装状況

次の内容を実装済み。DB Migrationは不要なため作成していない。

1. `RESOURCE_IN_USE` と依存件数をAPIエラー型へ追加。
2. 生徒、講師、教材、レッスン種別、レッスン、レッスン実績の削除・無効化処理に依存確認を追加。
3. APIのOpenAPIエラー仕様へ `details` を追加。
4. フロントエンド共通の削除エラー変換と、日本語・繁体字中国語のトースト処理を追加。
5. 関連データがある場合は削除モーダルを閉じず、APIが返した依存件数を表示。
6. DB外部キーの `CASCADE` / `SET NULL` は変更せず、既存の安全網を維持。

依存確認はNeon HTTP接続で実行する複数のCOUNTと更新処理で構成している。高い同時更新耐性が必要になった場合は、Neon WebSocket接続またはNode.js接続プールによるトランザクション化を追加する。

## 9. テスト観点

- 関連データがない生徒を削除操作すると無効化できる。
- レッスンがある生徒を削除操作すると409になり、トーストが表示される。
- 支払い記録がある生徒を削除操作すると409になり、支払い記録の件数が表示される。
- 購入記録がある教材を削除操作すると409になり、取扱終了を案内する。
- 支払い消化済みのレッスンを削除・キャンセルできない。
- 物理削除を直接実行してもDB外部キーで保護される。
- APIエラーの英語メッセージではなく、日本語・繁体字中国語のトーストが表示される。
- 関連件数の確認と削除操作の間に新しい関連が作成された場合も、API側で削除を拒否できる。
