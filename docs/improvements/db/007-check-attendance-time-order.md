# DB改善 007: 出勤記録の時刻順制約

## 目的

出勤時刻より前の退勤時刻を登録できないようにする。API以外の登録経路でも出勤時間の基本的な整合性を保証する。

## 変更内容

- `attendance_records.clock_out_at`がNULL、出勤時刻がNULL、または出勤時刻以降であることをCHECK制約で保証

## 互換性

既存のAPI形式は変更しない。出勤途中で退勤時刻が未入力の記録は引き続き許可する。

## チェック

- [x] DrizzleスキーマにCHECK制約を追加
- [x] マイグレーション生成 (`api/drizzle/0017_massive_nemesis.sql`)
- [x] APIビルド
- [x] APIテスト (5 files / 33 tests)
- [x] Gitコミット
