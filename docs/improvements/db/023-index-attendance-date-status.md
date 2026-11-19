# DB追加改善 023: 出勤記録の日付・状態インデックス

## 目的

出勤記録の管理一覧は日付範囲で絞り込み、状態を表示・集計する。日付と状態の複合インデックスを追加し、全スタッフの期間一覧を効率化する。

## 変更内容

- `attendance_records(attendance_date, status)`を追加

## チェック

- [x] Drizzleスキーマを更新
- [x] マイグレーション生成（`api/drizzle/0033_slim_mephisto.sql`）
- [x] APIビルド・テスト（5ファイル・35テスト）
- [x] Gitコミット
