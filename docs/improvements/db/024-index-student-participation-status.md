# DB追加改善 024: 生徒参加状態の複合インデックス

## 目的

生徒別のレッスン履歴では、参加状態を合わせて確認する。生徒IDと参加状態の複合インデックスを追加し、出席・欠席の集計を効率化する。

## 変更内容

- `lesson_students(student_id, participation_status)`を追加

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0034_yellow_kulan_gath.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
