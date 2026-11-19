# API改善 010: 管理権限チェックの共通化

## 目的

支払いレポートとダッシュボードアラートが、それぞれ`user.role !== 'representative'`を直接判定していた。共通の`requireRole`を利用し、代表専用APIの権限処理を統一する。

## 変更内容

- 支払いレポートAPIで`requireRole`を利用
- ダッシュボードアラートAPIで`requireRole`を利用
- ステータス、エラーコード、レスポンス形式は変更しない

## チェック

- [x] 代表専用ルートの判定を共通化
- [x] APIビルド
- [x] APIテスト (5 files / 34 tests)
- [x] Gitコミット
