# DB改善 005: 担当期間の日時整合性制約

## 目的

講師と生徒の担当割り当てに、開始日時より前の終了日時が入らないようにする。API以外の登録経路でも担当期間の整合性を守る。

## 変更内容

- `teacher_student_assignments.ended_at`がNULLまたは`assigned_at`以降であることをCHECK制約で保証

## 互換性

既存のAPI形式と担当割り当ての参照方法は変更しない。NULLの終了日時は継続中として許可する。

## チェック

- [x] DrizzleスキーマにCHECK制約を追加
- [x] マイグレーション生成 (`api/drizzle/0015_skinny_otto_octavius.sql`)
- [x] APIビルド
- [x] APIテスト (5 files / 33 tests)
- [x] Gitコミット
