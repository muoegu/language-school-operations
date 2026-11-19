# フロントエンド構成書

## 1. 文書の目的

語学学校向け業務管理システムのフロントエンドについて、応募用MVPで実装する画面、責務、データの流れ、ディレクトリ構成を定義する。

本書は `docs/disco_vue_portfolio_spec.md` の方針を具体化したものであり、実装時の判断基準とする。対象はレッスン予定・授業実績・講師別集計を中心とした管理画面である。

## 2. 基本方針

表示文言は `vue-i18n` で管理する。日本語（`ja`）と繁体字中国語（`zh-TW`）の翻訳キーを必ず用意し、新機能の固定文字列をテンプレートへ直接書かない。詳細は [フロントエンド i18n 方針](./i18n.md) を参照する。

| 項目 | 方針 |
| --- | --- |
| フレームワーク | Vue 3 / TypeScript / Vite |
| UI | Nuxt UIを中心に構成する |
| ルーティング | Vue Router |
| API通信 | OpenAPI仕様をKubbで読み込み、Fetchクライアントと型を生成する |
| サーバーデータ | TanStack Vue Queryを使用し、Kubb生成のComposableで取得・更新する |
| クライアント状態 | Piniaは認証情報や表示設定など、画面をまたぐUI状態に限定する |
| 多言語化 | vue-i18n。日本語（`ja`）と繁体字中国語（`zh-TW`）に対応する |
| テスト | Vitestで業務ロジック、Playwrightで主要導線を確認する |
| 公開デモ | 初期表示は架空データの閲覧を優先し、書き込み操作は公開方法に応じて制限する |

## 3. MVPの画面構成

### 3.1 共通レイアウト

全画面で次のレイアウトを共有する。

- 左サイドバー：画面遷移、現在位置の表示
- ヘッダー：ページタイトル、言語切替、デモ環境表示
- メイン領域：画面ごとの一覧・フォーム・集計カード
- モバイル幅ではサイドバーをドロワーまたはメニューに切り替える

画面上には「デモ環境」「架空データ」などの表示を用意し、実運用システムと誤認されないようにする。

### 3.2 ルート一覧

| パス | 画面 | 役割 |
| --- | --- | --- |
| `/` | ダッシュボード | 今日のレッスン件数、未処理件数、当月の実績概要を表示 |
| `/lessons` | レッスン一覧 | 日付、講師、状態で検索・絞り込み |
| `/students` | 生徒一覧 | 生徒の一覧表示、新規作成、編集、削除 |
| `/teachers` | 講師一覧 | 講師の一覧表示、新規作成、編集、削除 |
| `/lessons/:id` | レッスン詳細 | 予定情報の確認、授業実績の登録・状態更新 |
| `/reports/teachers` | 講師実績 | 月・講師ごとの授業数、実施時間、キャンセル数を表示 |
| `/settings` | 設定 | 言語、表示密度などのUI設定を管理。MVPでは最低限でもよい |
| `/:pathMatch(.*)*` | 404 | 存在しない画面への遷移を案内 |

認証画面はデモログインとして実装する。講師を選択してログインし、APIが発行するHttpOnly Cookieで以降のリクエストを認証する。Better Auth導入時に差し替えやすいよう、認証状態は `composables` に集約する。

## 4. 各画面の仕様

### 4.1 ダッシュボード

#### 表示内容

- 今日のレッスン総数
- 実施済み、予定、欠席、キャンセルの件数
- 今月の実施レッスン数
- 今月の実施時間
- 直近のレッスン一覧
- 授業実績が未登録のレッスン一覧

#### 操作

- レッスン一覧へ移動
- 未処理レッスンの詳細へ移動
- 集計対象月を変更する

ダッシュボード独自の集計ロジックは持たず、APIから取得した集計結果を表示する。集計値の定義はAPI・DB仕様書で統一する。

### 4.2 レッスン一覧

#### 検索条件

- 対象日、または期間
- 講師
- レッスン状態
- キーワード（生徒名、レッスン名など。APIが対応する場合）

#### 一覧項目

- 日時
- 講師名
- 生徒名
- レッスン内容またはレベル
- 状態
- 授業実績の登録状態
- 詳細画面へのリンク

#### 状態

- `scheduled`：予定
- `completed`：実施済み
- `absent`：欠席
- `cancelled`：キャンセル

状態の表示名は画面に直接記述せず、i18nの辞書から取得する。

#### UX方針

- 検索条件をURLクエリに反映し、再読み込みやURL共有後も同じ条件を復元する
- 初期表示は当日を含む直近の期間にする
- データが0件の場合は空状態と、条件をリセットする操作を表示する
- API取得中はスケルトンまたはローディング表示を行う
- ページングまたは表示件数上限を設け、大量データを一度に描画しない

### 4.3 レッスン詳細・授業実績登録

#### 表示内容

- レッスン日時
- 講師、生徒
- レッスン内容、レベル、教材
- 現在の状態
- 授業実績の有無
- 更新日時

#### 更新項目

- レッスン状態
- 実施開始時刻、終了時刻
- 実施メモ
- 欠席理由またはキャンセル理由（必要な場合）

#### バリデーション

- 状態は定義済みの値だけを選択できる
- 実施済みの場合、実施時刻の入力を必須にする
- 終了時刻は開始時刻より後にする
- 欠席・キャンセル時は理由を任意または必須とするか、API仕様に合わせて統一する
- 保存前に変更内容を確認できるようにする

#### 更新フロー

1. 詳細画面を表示する
2. 現在の状態と実績情報を確認する
3. 状態または実績情報を入力する
4. クライアント側で入力値を検証する
5. APIへ更新リクエストを送信する
6. 成功時は最新データを再取得し、完了通知を表示する
7. 失敗時は入力内容を保持したまま、APIエラーを画面に表示する

状態遷移の最終的な可否はAPIで検証する。フロントエンドだけで状態遷移を保証しない。

### 4.4 講師実績

#### 検索条件

- 対象月
- 講師

#### 集計項目

- 授業件数
- 実施件数
- 実施時間
- 欠席件数
- キャンセル件数

#### 表示形式

- 上部：対象月、総実施件数、総実施時間のサマリーカード
- 中央：講師別の集計テーブル
- 下部：必要に応じて日別または講師別の内訳

集計値はフロントエンドでレッスン全件から再計算せず、APIが返す集計結果を表示する。表示用の合計計算が必要な場合も、APIの定義と一致することをテストで確認する。

## 5. ディレクトリ構成

```text
web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.ts
    ├── App.vue
    ├── router/
    │   └── index.ts
    ├── layouts/
    │   ├── AppLayout.vue
    │   └── components/
    │       ├── AppSidebar.vue
    │       ├── AppHeader.vue
    │       └── LanguageSwitcher.vue
    ├── pages/
    │   ├── DashboardPage.vue
    │   ├── HomePage.vue              # 生徒一覧の実装本体（/studentsから利用）
    │   ├── LessonsPage.vue
    │   ├── LessonDetailPage.vue
    │   └── TeachersPage.vue
    ├── features/
    │   ├── dashboard/
    │   │   ├── components/
    │   │   ├── composables/
    │   │   └── types.ts
    │   ├── lessons/
    │   │   ├── components/
    │   │   ├── composables/
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   ├── lesson-records/
    │   │   ├── components/
    │   │   ├── composables/
    │   │   ├── schemas.ts
    │   │   └── types.ts
    │   └── teacher-reports/
    │       ├── components/
    │       ├── composables/
    │       └── types.ts
    ├── components/
    │   ├── students/
    │   │   ├── StudentFormModal.vue
    │   │   └── StudentDeleteModal.vue
    │   ├── teachers/
    │   │   ├── TeacherFormModal.vue
    │   │   └── TeacherDeleteModal.vue
    │   ├── lessons/
    │       ├── LessonCalendar.vue
    │       ├── LessonFormModal.vue
    │       ├── LessonDeleteModal.vue
    │       └── LessonRecordForm.vue
    │   ├── common/
    │   │   ├── AppEmptyState.vue
    │   │   ├── AppErrorState.vue
    │   │   ├── AppLoading.vue
    │   │   └── StatusBadge.vue
    │   └── form/
    │       ├── FormFieldError.vue
    │       └── DateRangeField.vue
    ├── composables/
    │   ├── useApiError.ts
    │   ├── useLocale.ts
    │   └── useToast.ts
    ├── stores/
    │   └── ui.ts
    ├── lib/
    │   ├── api-client.ts
    │   ├── date.ts
    │   └── format.ts
    ├── i18n/
    │   ├── index.ts
    │   └── locales/
    │       ├── ja.ts
    │       └── zh-TW.ts
    ├── styles/
    │   ├── main.css
    │   └── tokens.css
    └── test/
        ├── setup.ts
        └── fixtures/
```

### 5.1 配置の考え方

- `pages` はルート単位の組み立てに集中し、複雑な業務ロジックを置かない
- `features` は業務領域ごとに分け、一覧・フォーム・取得処理・型を近くに置く
- `components/common` は複数の業務領域で再利用できるUIだけを置く
- `lib` はAPIクライアント、日付、表示フォーマットなど、Vueに依存しない処理を置く
- `stores` はAPIデータの保管場所にしない。画面表示設定などの共有UI状態に限定する

## 6. API通信とデータフロー

### 6.1 基本フロー

```text
Page
  ↓
Kubb generated Vue Query composable
  ↓
Kubb generated Fetch client
  ↓
Hono API
  ↓
PostgreSQL
```

画面コンポーネントから直接 `fetch` を呼ばず、Kubbが生成したVue Query Composableをfeature単位で利用する。

Kubbでは、OpenAPI仕様から次のコードを生成する。

- TypeScriptのスキーマ・レスポンス型
- Fetch APIを利用する型付きクライアント
- TanStack Vue Queryの`queryOptions` / `mutationOptions`
- `hooks: true` による`useQuery` / `useMutation` Composable

ReactのHooksに相当するものを、VueではComposableとして生成できる。GETはQuery、POST・PUT・PATCH・DELETEはMutationとして扱う。ページングAPIを追加する場合は、必要なエンドポイントだけ`useInfiniteQuery`生成対象にする。

### 6.2 composableの例

```text
useLessonsQuery()
useLessonQuery(id)
useUpdateLessonStatus()
useTeacherMonthlyReport()
```

composableの責務は次のとおりとする。

- APIの呼び出し
- loading / error / dataの状態管理
- クエリパラメータの組み立て
- 更新成功後の再取得またはキャッシュ更新
- APIエラーを画面で扱える形式への変換

入力値の業務ルールはAPIでも検証する。フロントエンドのZodスキーマは入力体験の改善を目的とし、セキュリティや整合性の根拠にはしない。

### 6.3 エラー処理

| 状況 | 表示 |
| --- | --- |
| 初回取得中 | スケルトンまたはローディング |
| 取得失敗 | 再試行ボタン付きのエラー状態 |
| 0件 | 条件変更を案内する空状態 |
| 入力不備 | 各項目の直下にエラー |
| 状態遷移エラー | フォーム上部にAPIメッセージを表示 |
| 保存成功 | トースト通知と最新データの表示 |
| 通信切断・タイムアウト | 再試行を促す通知 |

APIの内部エラー詳細やスタックトレースは画面に表示しない。

## 7. 状態管理

### サーバーデータ

レッスン、授業実績、講師実績など、APIから取得するデータはTanStack Vue QueryのQuery Cacheで管理する。Piniaへコピーして二重管理しない。

Kubb生成Composableは、キャッシュ、再取得、mutationの状態をTanStack Vue Queryへ委譲する。画面固有の表示変換やフォーム状態だけをfeature側で扱う。

### クライアント状態

Piniaまたは小さなcomposableで次の状態だけを管理する。

- 選択中の言語
- サイドバーの開閉状態
- 表示密度などのUI設定
- デモ環境の表示設定

検索条件はURLクエリを優先し、ブラウザの戻る・進むと連動させる。

## 8. 多言語化

### 対応ロケール

- `ja`：日本語
- `zh-TW`：繁体字中国語

### ルール

- 画面に表示する文言をテンプレートへ直接ハードコードしない
- 状態名、ボタン名、エラーメッセージ、空状態も翻訳対象にする
- 日付・時刻・数値の表示はロケールに応じてフォーマットする
- APIから返る業務コードと表示文言を分離する
- 翻訳キーは画面や機能単位で整理する

例：

```text
lessons.title
lessons.filters.status
lessons.status.scheduled
lessonRecord.actions.save
common.empty.noResults
```

翻訳が不足している場合にキー文字列が画面へ露出しないよう、開発時に未定義キーを検出する。

## 9. UI・アクセシビリティ方針

- Nuxt UIの標準コンポーネントを優先し、画面ごとの独自UIを増やしすぎない
- ボタン、リンク、フォーム部品の役割を明確にする
- キーボード操作で主要導線を完了できるようにする
- 色だけで状態を表現せず、ラベルやアイコンを併用する
- エラーは色だけでなくテキストで説明する
- テーブルは見出しと行の関係を保ち、狭い画面では横スクロールまたはカード表示にする
- 操作完了・失敗をトーストだけに頼らず、必要に応じて画面上にも反映する

## 10. テスト方針

### Vitest

次のロジックを優先してテストする。

- 日付範囲・月初月末の生成
- レッスン状態ラベルの変換
- 実施時間の計算・フォーマット
- フォーム入力のバリデーション
- APIエラーの画面表示用変換
- 翻訳キーの主要項目

### Playwright

応募用MVPでは、次の1本を最重要導線とする。

1. レッスン一覧を開く
2. 日付または状態で絞り込む
3. レッスン詳細を開く
4. 授業実績を登録する
5. 一覧または詳細に更新結果が反映される

日本語と繁体字中国語の切替、0件表示、APIエラー表示は、可能な範囲で追加確認する。

## 11. 実装順序

1. Vite、Vue、TypeScript、Vue Router、Nuxt UIの初期設定
2. 共通レイアウト、サイドバー、言語切替
3. レッスン一覧と検索条件のURL同期
4. レッスン詳細の表示
5. 授業実績の登録・状態更新
6. APIエラー、ローディング、空状態の整備
7. 講師実績の集計画面
8. ダッシュボード
9. Vitestと主要導線のPlaywrightテスト
10. README、スクリーンショット、公開デモ向けの表示調整

## 12. MVP外の拡張候補

次の機能は、主要導線が完成した後に追加する。

- 生徒・スタッフ・支払い管理
- 認証、権限管理、監査ログ
- 出退勤・休暇申請・承認
- CSV出力
- カレンダー表示
- 講師別・日別のグラフ
- オフライン対応や高度なキャッシュ

拡張時も、業務領域を `features` 単位で追加し、既存の共通コンポーネントとAPI通信の責務を維持する。

## 13. 現時点の実装状況

### 13.1 実装済み

フロントエンドの初期構成として、Vue 3 + Vite + TypeScript のアプリを作成済みである。

- `web/` をフロントエンドのアプリケーションルートとする
- Vue Routerを導入し、`/` をホーム画面として定義する
- Nuxt UI v4をVue + Vite構成で利用できるようにする
- Tailwind CSS v4とNuxt UIのテーマCSSを読み込む
- `UApp` でアプリ全体をラップする
- ホーム画面にタイトル、API接続確認、生徒一覧を表示する
- Nuxt UIの自動コンポーネント型定義を生成できる設定にする
- `vite-plugin-vue-devtools` を導入し、開発時のVue DevToolsオーバーレイを表示できるようにする
- ビルドとTypeScriptの型チェックを実行できるようにする

現時点では、API側にデモ認証、担当範囲認可、複数講師・複数生徒、授業記録CRUD、教科書CRUD、レッスン情報CRUD、支払い記録CRUDが実装済みである。フロント側もログイン、ロール別ナビゲーション、レッスン詳細、授業記録フォーム、スタッフの記録非表示、教科書・レッスン情報マスタ、支払い記録のAPI接続まで対応済みである。共通レイアウト、生徒・講師・レッスンの基本CRUD、OpenAPIからのKubb生成、TanStack Vue Query接続も実装済みである。授業記録の登録時にはAPI側で支払い記録の残回数を自動消化し、顧客詳細画面へ反映する。

### 13.2 現在の実ファイル構成

```text
web/
├── env.d.ts
├── index.html
├── package.json
├── kubb.config.ts
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.vue
    ├── main.ts
    ├── assets/
    │   └── css/
    │       └── main.css
    ├── layouts/
        └── AppLayout.vue
    ├── pages/
        ├── DashboardPage.vue
        ├── LoginPage.vue
        ├── HomePage.vue
        ├── StudentDetailPage.vue
        ├── LessonsPage.vue
        ├── LessonDetailPage.vue
        ├── TextbooksPage.vue
        ├── LessonPricesPage.vue
        └── TeachersPage.vue
    ├── composables/
    │   ├── useAuth.ts
    │   └── useBillingMockData.ts
    ├── components/
        ├── lessons/
        │   ├── LessonFormModal.vue
        │   └── LessonDeleteModal.vue
        ├── billing/
        │   ├── TextbookFormModal.vue
        │   ├── TextbookDeleteModal.vue
        │   ├── LessonPriceFormModal.vue
        │   └── LessonPriceDeleteModal.vue
        ├── students/
        │   ├── StudentFormModal.vue
        │   └── StudentDeleteModal.vue
        ├── teachers/
            ├── TeacherFormModal.vue
            └── TeacherDeleteModal.vue
        └── shared/
        │   ├── ConfirmDeleteModal.vue
        │   └── CrudTableActions.vue
    └── api/
        └── generated/
            ├── clients/
            ├── hooks/
            └── types/
```

### 13.3 ファイルごとの責務

| ファイル | 責務 |
| --- | --- |
| `web/index.html` | Viteのエントリーポイント、HTML言語、タイトル、ルート要素を定義 |
| `web/vite.config.ts` | VueプラグインとNuxt UI Viteプラグインを登録 |
| `web/tsconfig.json` | Vue・Vite・Nuxt UIの型チェック設定を定義 |
| `web/src/main.ts` | CSS、Vue Router、Nuxt UI Vueプラグインを登録してアプリを起動 |
| `web/src/App.vue` | `UApp` と `RouterView` を配置するアプリケーションシェル |
| `web/src/layouts/AppLayout.vue` | デスクトップ用左サイドバー、ヘッダー、モバイル用メニューモーダルを提供 |
| `web/src/pages/DashboardPage.vue` | `/` のダッシュボード。カレンダーと講師向けの今後のレッスン・タスク一覧を表示 |
| `web/src/pages/HomePage.vue` | `/students` の生徒一覧。生成Composableで取得し、CRUDモーダルを開く |
| `web/src/pages/TeachersPage.vue` | `/teachers` の講師一覧。講師CRUDと確認モーダルを管理 |
| `web/src/pages/LessonsPage.vue` | `/lessons` のレッスン一覧。講師・生徒名の参照表示、カレンダー、レッスンCRUDを管理 |
| `web/src/pages/LessonDetailPage.vue` | `/lessons/:lessonId` の詳細。レッスン情報と授業記録CRUDを管理 |
| `web/src/pages/StudentDetailPage.vue` | `/students/:studentId` の顧客詳細。チケット残数、支払い記録、チケット購入を表示 |
| `web/src/pages/InvoicePrintPage.vue` | `/print/payment-record/:paymentRecordId` の請求書表示。API取得後に印刷・PDF保存を実行 |
| `web/src/components/billing/InvoiceDocument.vue` | 支払い記録1件を請求書レイアウトへ変換して描画 |
| `web/src/pages/TextbooksPage.vue` | `/textbooks` の教科書マスタ。API接続した一覧・作成・編集・削除を管理 |
| `web/src/pages/LessonPricesPage.vue` | `/lesson-prices` のレッスン情報マスタ。API接続した料金一覧・作成・編集・削除を管理 |
| `web/src/pages/AttendancePage.vue` | `/attendance` の出勤記録一覧。講師は自分の記録、スタッフ・管理部は全件を表示 |
| `web/src/components/lessons/LessonRecordForm.vue` | 実施結果、実施日時、授業メモ、次回課題を入力するフォーム |
| `web/src/components/billing/TextbookFormModal.vue` | 教科書の新規作成・編集フォーム。APIの`Textbook`型に対応 |
| `web/src/components/billing/TextbookDeleteModal.vue` | 教科書削除前の確認モーダル |
| `web/src/components/billing/LessonPriceFormModal.vue` | レッスン情報の新規作成・編集フォーム。APIの`LessonType`型に対応 |
| `web/src/components/billing/LessonPriceDeleteModal.vue` | レッスン情報削除前の確認モーダル |
| `web/src/components/shared/ConfirmDeleteModal.vue` | 削除確認UIをNuxt UIのモーダル・アラート・ボタンへ統一する共通部品 |
| `web/src/components/shared/CrudTableActions.vue` | 一覧テーブルの編集・削除アクションを共通化する部品 |
| `web/src/utils/durations.ts` | 在籍期間・受講歴など、開始日と終了日から年月を表示する共通関数 |
| `web/src/composables/useBillingMockData.ts` | 旧モック実装。現行の支払い画面では使用せず、支払い記録APIを利用する |
| `web/src/components/*/*Modal.vue` | 作成・編集フォームと削除確認をページから分離したNuxt UIモーダル |
| `web/kubb.config.ts` | OpenAPIから型、Fetchクライアント、Vue Query Composableを生成する設定 |
| `web/src/api/generated/` | Kubbが生成する編集禁止の型・クライアント・Composable |
| `web/src/assets/css/main.css` | Tailwind CSS、Nuxt UI、アプリ全体の基本スタイルを読み込む |
| `web/package.json` | フロントエンドの依存関係と開発・ビルドスクリプトを定義 |

### 13.4 依存関係

| パッケージ | 用途 |
| --- | --- |
| `vue` | UIフレームワーク |
| `vite` | 開発サーバー・ビルド |
| `@vitejs/plugin-vue` | ViteでVue SFCを扱うためのプラグイン |
| `vue-router` | 画面ルーティング |
| `@nuxt/ui` | UIコンポーネントとテーマ |
| `tailwindcss` | ユーティリティCSS |
| `vite-plugin-vue-devtools` | 開発時のVue DevToolsオーバーレイ、コンポーネント検査、エディタ連携 |
| `@tanstack/vue-query` | APIレスポンスのキャッシュ、再取得、Mutation状態の管理 |
| `kubb` | OpenAPIからのコード生成CLI |
| `@kubb/plugin-ts` | TypeScript型の生成 |
| `@kubb/plugin-fetch` | Fetch APIクライアントの生成 |
| `@kubb/plugin-vue-query` | TanStack Vue QueryのComposable生成 |
| `typescript` | 静的型付け |
| `vue-tsc` | Vue SFCを含む型チェック |

### 13.5 現在の画面

```text
GET /
└── App.vue
    └── UApp
        └── RouterView
            └── HomePage.vue
                ├── `DashboardPage.vue`（`/`）
                │   └── 導入メッセージ
                ├── `HomePage.vue`（`/students`）
                │   ├── `useGetHealthz()` → `GET /api/v1/healthz`
                │   ├── `useGetStudents()` → `GET /api/v1/students`
                │   └── `UTable` + 生徒CRUDモーダル
                ├── `StudentDetailPage.vue`（`/students/:studentId`）
                │   ├── 顧客情報・チケット残数
                │   ├── 支払い記録テーブル
                │   └── 支払い記録API・レッスン情報・教科書を使う購入モーダル
                ├── `InvoicePrintPage.vue`（`/print/payment-record/:paymentRecordId`）
                │   ├── `useGetPaymentRecordsPaymentrecordid()` → 支払い記録1件
                │   ├── `useGetLessons()` → 消化済みレッスンの表示情報
                │   └── `InvoiceDocument.vue` → 請求書描画・ブラウザ印刷
                ├── `TeachersPage.vue`（`/teachers`）
                │   ├── `useGetTeachers()` → `GET /api/v1/teachers`
                │   └── `UTable` + 講師CRUDモーダル
                └── `LessonsPage.vue`（`/lessons`）
                    ├── `useGetLessons()` → `GET /api/v1/lessons`（ログイン中ユーザーの範囲）
                    ├── `useGetTeachers()` / `useGetStudents()`（表示名解決・フォーム選択肢）
                    └── `UTable` + レッスンCRUDモーダル
                └── `LessonDetailPage.vue`（`/lessons/:lessonId`）
                    ├── `useGetLessonsLessonid()` → レッスン詳細
                    ├── `useGetLessonsLessonidRecord()` → 授業記録
                    └── `LessonRecordForm.vue` → 記録・次回課題CRUD
                ├── `TextbooksPage.vue`（`/textbooks`）
                │   ├── `useGetTextbooks()` → 教科書一覧
                │   ├── `usePostTextbooks()` / `usePatchTextbooksTextbookid()`
                │   └── `useDeleteTextbooksTextbookid()` + 確認モーダル
                └── `LessonPricesPage.vue`（`/lesson-prices`）
                    ├── `useGetLessonTypes()` → レッスン情報一覧
                    ├── `usePostLessonTypes()` / `usePatchLessonTypesLessontypeid()`
                    └── `useDeleteLessonTypesLessontypeid()` + 確認モーダル
                └── `AttendancePage.vue`（`/attendance`）
                    ├── 講師：自分の出勤記録のみ
                    └── スタッフ・管理部：全講師の出勤記録
```

ダッシュボードはカレンダーを中心に表示し、生徒一覧は`/students`、顧客詳細は`/students/:studentId`で表示する。次の画面を追加する場合は、`src/pages/` にページを追加し、`src/main.ts` のルート定義へ登録する。

## 14. 開発・検証手順

### 開発サーバー

リポジトリルート、または `web/` から実行する。

```bash
pnpm dev:web
# または
pnpm --dir web dev
```

ブラウザで `http://localhost:5173/` を開くとダッシュボードを確認できる。左サイドバーから `/students`、`/teachers`、`/lessons`、`/textbooks`、`/lesson-prices` へ移動できる。

### APIの起動

フロントエンドの開発プロキシは、`/api/*` を `http://localhost:3000` へ転送する。APIも起動してからホーム画面を開く。

```bash
pnpm dev:api
pnpm dev:web
```

### OpenAPI・Kubbコード生成

Kubbは起動中のAPIが公開するOpenAPIエンドポイントを直接読み込んで生成する。OpenAPI JSONをリポジトリへスナップショット保存しない。

```bash
pnpm dev:api
pnpm --dir web generate:api
```

生成される主なファイルは次のとおり。

```text
web/src/api/generated/
├── clients/
│   ├── getHealthz.ts
│   ├── getLessons.ts
│   ├── getReadyz.ts
│   └── postLessons.ts
├── hooks/
│   ├── useGetHealthz.ts
│   ├── useGetLessons.ts
│   ├── useGetReadyz.ts
│   └── usePostLessons.ts
└── types/
```

`src/api/generated/` 配下は手動編集しない。APIのZod/OpenAPI定義を変更したら、必ずコード生成を再実行する。

### 本番ビルド

```bash
pnpm build:web
# または
pnpm --dir web build
```

生成物は `web/dist/` に出力される。`dist/` はGit管理対象外とする。

### 型チェック

```bash
pnpm type-check:web
# または
pnpm --dir web type-check
```

Nuxt UIのViteプラグインが生成する `auto-imports.d.ts` と `components.d.ts` を参照するため、クリーンな環境では先にビルドを実行する。ビルドと型チェックを連続して実行する場合は、次のコマンドを使う。

```bash
pnpm --dir web build:check
```

### コード品質

Vue 3 と TypeScript の実装は、ESLint（flat config）と Prettier で統一する。Nuxt UI の自動import、Vue SFC、TypeScript を対象にし、OpenAPIから生成する `src/api/generated/` とビルド生成物は対象外とする。

```bash
# 問題の検出
pnpm --dir web lint
pnpm --dir web format

# 自動修正・整形
pnpm --dir web lint:fix
pnpm --dir web format:write
```

実装を変更したら、提出前に `pnpm --dir web type-check`、`pnpm --dir web lint`、`pnpm --dir web format`、`pnpm --dir web build` を順に実行する。

### フロントエンドテスト

回帰確認として、Vitestで表示用ユーティリティ、入力スキーマ、ロール権限、共通CRUD操作、登録フォームを確認する。Playwrightではログイン、ログイン後の遷移、未認証時のリダイレクト、スタッフの権限制御を確認する。PlaywrightのテストではAPIを固定レスポンスに差し替えるため、ローカルDBを起動せずに画面の確認ができる。

```bash
# 単体・コンポーネントテスト
pnpm --dir web test

# カバレッジレポートを含む単体・コンポーネントテスト
pnpm --dir web test:coverage

# Chromiumでブラウザテスト
pnpm --dir web test:e2e
```

初回のみPlaywright用Chromiumを取得する。

```bash
pnpm --dir web exec playwright install chromium
```

### 現在の検証結果

- `pnpm --dir web build:check`：成功
- `pnpm --dir web lint`：成功
- `pnpm --dir web format`：成功
- `pnpm --dir web test:coverage`：成功（27件、対象範囲の行カバレッジ 86.23%）
- `pnpm --dir web test:e2e`：成功（4件）
- `pnpm --dir web generate:api`：API変更後に再実行し、生成ファイル数とComposableを確認する
- Vueの本番ビルド：成功
- `vue-tsc --noEmit`：成功

## 15. OpenAPI・Kubb・TanStack Vue Query

### 生成構成

`web/kubb.config.ts` では次の3つを組み合わせる。

```text
GET http://localhost:3000/api/v1/doc
  ↓
pluginTs
  ├── TypeScriptの型
pluginFetch
  ├── 型付きFetchクライアント
pluginVueQuery({ hooks: true })
  ├── queryOptions / queryKey
  └── useQuery / useMutation Composable
```

`hooks: true` によって、ReactのHooksに相当するVue Composableを生成する。現在のOpenAPIからは、次のComposableが生成されている。

| HTTP操作 | 生成Composable |
| --- | --- |
| `GET /healthz` | `useGetHealthz` |
| `GET /readyz` | `useGetReadyz` |
| `GET /lessons` | `useGetLessons` |
| `POST /lessons` | `usePostLessons` |
| `GET /lessons/:lessonId` | `useGetLessonsLessonid` |
| `PATCH /lessons/:lessonId` | `usePatchLessonsLessonid` |
| `DELETE /lessons/:lessonId` | `useDeleteLessonsLessonid` |
| `GET /lessons/:lessonId/record` | `useGetLessonsLessonidRecord` |
| `POST /lessons/:lessonId/record` | `usePostLessonsLessonidRecord` |
| `PATCH /lessons/:lessonId/record` | `usePatchLessonsLessonidRecord` |
| `DELETE /lessons/:lessonId/record` | `useDeleteLessonsLessonidRecord` |
| `GET /students` | `useGetStudents` |
| `POST /students` | `usePostStudents` |
| `PATCH /students/:studentId` | `usePatchStudentsStudentid` |
| `DELETE /students/:studentId` | `useDeleteStudentsStudentid` |
| `GET /teachers` | `useGetTeachers` |
| `POST /teachers` | `usePostTeachers` |
| `PATCH /teachers/:teacherId` | `usePatchTeachersTeacherid` |
| `DELETE /teachers/:teacherId` | `useDeleteTeachersTeacherid` |
| `GET /auth/demo/options` | `useGetAuthDemoOptions` |
| `POST /auth/demo/login` | `usePostAuthDemoLogin` |
| `POST /auth/logout` | `usePostAuthLogout` |
| `GET /me` | `useGetMe` |
| `GET /me/students` | `useGetMeStudents` |
| `GET /lessons/:lessonId` | `useGetLessonsLessonid` |
| `PATCH /lessons/:lessonId` | `usePatchLessonsLessonid` |
| `DELETE /lessons/:lessonId` | `useDeleteLessonsLessonid` |


### Vue側の初期化

`web/src/main.ts` で `VueQueryPlugin` をアプリへ登録する。これにより生成Composableは共通のQuery CacheとQueryClientを利用できる。

```ts
app.use(VueQueryPlugin)
```

### API接続

生成クライアントのベースURLは `/api/v1` とし、開発時はViteのproxyでAPIサーバーへ転送する。公開時は同一ドメイン配下の `/api/v1` を利用する想定である。KubbのOpenAPI入力URLは `API_OPENAPI_URL` で上書きできる。

ホーム画面では、生成された `useGetHealthz()` を使ってAPIへ接続し、取得結果またはエラーを表示する。これにより、生成コードが単なる型定義ではなく、実際の画面から利用できることを確認できる。

## 16. Vue DevTools

画面右下などに表示されるVueのVマークと、コンポーネントを選択してソースファイルを開く機能はNuxt UIではなく、`vite-plugin-vue-devtools` が提供する開発用機能である。

### 設定

`web/vite.config.ts` に次のプラグインを登録している。

```ts
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vueDevTools(),
    vue(),
    ui(),
  ],
})
```

この機能は開発サーバーでのみ利用する。設定を追加・変更した後は、起動中のVite開発サーバーを一度停止してから再起動する。

```bash
pnpm dev:web
```

### 表示されない場合

1. 既存のVite開発サーバーを停止する
2. `pnpm dev:web` で再起動する
3. ブラウザをハードリロードする
4. Vマークが表示されたらクリックしてDevToolsを開く

本番ビルドでは開発用オーバーレイは表示されない。コンポーネントからファイルを開く機能は、ローカルのエディタやViteの起動環境によって動作が変わる。

## 17. 現在実装している画面仕様

### 17.1 共通レイアウト

`App.vue` は `UApp` の中で全ページを `AppLayout` に包む。`AppLayout` はページ本体をスロットで受け取り、画面間で共通のナビゲーションを提供する。

| 要素 | 仕様 |
| --- | --- |
| 左サイドバー | デスクトップ幅（`lg`以上）で固定表示。白背景、幅256px、境界線あり |
| ブランド | `Language School / Operations` とバージョンを表示 |
| ナビゲーション | ダッシュボード、生徒一覧、講師一覧、レッスン一覧 |
| 現在地 | `route.path` とメニューのパスを比較して水色背景で表示 |
| ヘッダー | 現在のページタイトル、システム名、デモ環境表示 |
| モバイル | サイドバーを非表示にし、ヘッダーのメニューボタンから `UModal` を開く |
| 配色 | 白・slateを基調に、primaryはsky。ダークモードは使用しない |

### 17.1.1 ダッシュボード `/`

ダッシュボードは全ユーザーにレッスンカレンダーを表示し、講師ロールの場合だけ講師向けの補助情報を表示する。

| 要素 | 仕様 |
| --- | --- |
| レッスンカレンダー | APIから取得したレッスンを月・週・日表示で確認し、選択時はレッスン詳細へ遷移 |
| 今後のレッスン | 講師ログイン時のみ表示。直近のレッスン日時、タイトル、生徒名、所要時間を表示 |
| タスク一覧 | 講師ログイン時のみ表示。授業記録入力、教材準備、課題確認などのダミータスクを表示 |
| タスク状態 | ダミーデータをクリックして未完了・完了を切り替える。現時点ではAPIへ保存しない |
| データソース | 今後のレッスンとタスクは現時点では`DashboardPage.vue`内のダミーデータ |
| 顧客アラート | 管理部（`representative`）のみ表示。最近レッスンがない顧客は前回のレッスン日、支払いが遅れている顧客は支払いの締切日、誕生日が近い顧客は誕生日を表示 |
| アラート操作 | 顧客カードをクリックすると顧客一覧へ遷移。現時点ではダミーデータ |

### 17.1.2 出勤記録 `/attendance`

出勤記録は `/api/v1/attendance-records` から取得する。代表・スタッフはユーザー選択で `userId` を指定して1人分を表示し、講師はログイン中のユーザーIDを指定せず自分の記録だけを表示する。登録時はリクエストに `userId` を含めず、APIがセッションのユーザーIDを使用する。

| ロール | 閲覧範囲 |
| --- | --- |
| `representative`（管理部） | 全講師の出勤記録 |
| `staff`（スタッフ） | 全講師の出勤記録 |
| `teacher`（講師） | ログイン中の講師本人の出勤記録 |

表示項目は日付、ユーザー、出勤時刻、退勤時刻、状態、備考とする。状態は出勤・遅刻・欠勤を表示する。Kubb生成の `useGetAttendanceRecords` と `usePostAttendanceRecords` を利用する。

### 17.2 一覧画面共通仕様

生徒・講師・レッスンのページは、以下の構造を共通にする。

1. ページタイトルと説明を表示する
2. 右上に新規作成ボタンを置く
3. 白背景・境界線・角丸のカード内に `UTable` を表示する
4. API取得中は `UTable` のloadingを表示する
5. 取得失敗時は `UAlert` を表示する
6. 0件時は空メッセージを表示する
7. 各行の末尾に編集・削除アイコンを表示する
8. 削除前に確認モーダルを開き、「この操作は取り消せません。」を確認文の次の行に表示する

Mutation成功後は対象Queryを再取得し、一覧を最新状態にする。失敗時はモーダルを閉じず、フォーム内にエラーを表示する。

### 17.3 生徒一覧 `/students`

| 項目 | 仕様 |
| --- | --- |
| 取得 | `useGetStudents()` |
| テーブル | 氏名、メールアドレス、レベル、クラス、状態、登録日、操作 |
| 作成 | `usePostStudents()` と `StudentFormModal.vue` |
| 編集 | `usePatchStudentsStudentid()` と同じフォームを再利用 |
| 削除 | `useDeleteStudentsStudentid()` と `StudentDeleteModal.vue` |
| フォーム | 氏名、メール、レベル、クラス。氏名は必須 |

### 17.4 講師一覧 `/teachers`

| 項目 | 仕様 |
| --- | --- |
| 取得 | `useGetTeachers()` |
| テーブル | 氏名、メールアドレス、雇用状況、在籍期間、操作 |
| 作成 | `usePostTeachers()` と `TeacherFormModal.vue` |
| 編集 | `usePatchTeachersTeacherid()` と同じフォームを再利用 |
| 削除 | `useDeleteTeachersTeacherid()` と `TeacherDeleteModal.vue` |
| フォーム | 氏名、メール、勤務開始日、勤務終了日。氏名と勤務開始日は必須 |

### 17.5 レッスン一覧 `/lessons`

| 項目 | 仕様 |
| --- | --- |
| 取得 | `useGetLessons()` |
| 参照データ | `useGetTeachers()` と `useGetStudents()` を利用し、IDを表示名へ変換 |
| テーブル | 日時、レッスン名、講師、生徒、ステータス、授業記録、操作 |
| 作成 | `usePostLessons()` と `LessonFormModal.vue` |
| 編集 | `usePatchLessonsLessonid()` と同じフォームを再利用 |
| 削除 | `useDeleteLessonsLessonid()` と `LessonDeleteModal.vue` |
| フォーム | 複数講師、複数生徒、レッスン名、レベル、開始日時、終了日時 |
| 日時 | APIにはISO 8601文字列、画面ではNuxt UIの`UInputDate` / `UInputTime`で入力 |
| バリデーション | 講師・生徒・名称・日時を必須とし、終了日時が開始日時より後であることを確認 |
| ステータス | `scheduled`、`completed`、`absent`、`cancelled`を日本語ラベルへ変換 |

レッスン更新APIの現仕様ではステータス自体を直接更新せず、レッスン基本情報を更新する。授業記録は詳細画面の`LessonRecordForm.vue`から別APIで登録・更新・削除する。

### 17.6 教科書一覧 `/textbooks`

教科書は支払い記録に紐付けるマスタ情報として管理する。現時点で一覧・新規作成・編集・削除をAPIへ接続している。

| 項目 | 仕様 |
| --- | --- |
| 取得 | `useGetTextbooks()`。初期表示は`page=1&pageSize=100` |
| テーブル | 教科書名、出版社、価格、状態、操作 |
| 作成 | `usePostTextbooks()` と `TextbookFormModal.vue` |
| 編集 | `usePatchTextbooksTextbookid()` と同じフォームを再利用 |
| 削除 | `useDeleteTextbooksTextbookid()`。API側では削除ではなく`discontinued`への変更 |
| フォーム | 教科書名、出版社、価格、通貨、販売状態 |
| 価格 | APIの`priceMinor`を日本円表示へ変換 |
| 状態 | APIの`selling` / `discontinued`を画面上では有効 / 停止中として表示 |

作成・編集の成功後は教科書一覧Queryを再取得する。削除は実行前に確認モーダルを表示し、API成功後に一覧を再取得する。

### 17.7 レッスン情報 `/lesson-prices`

レッスン情報はチケット購入時や料金表示で参照する料金マスタである。現時点で一覧・新規作成・編集・削除をAPIへ接続している。

| 項目 | 仕様 |
| --- | --- |
| 取得 | `useGetLessonTypes()`。初期表示は`page=1&pageSize=100` |
| テーブル | レッスン名、レベル、時間、レッスン料、状態、操作 |
| 作成 | `usePostLessonTypes()` と `LessonPriceFormModal.vue` |
| 編集 | `usePatchLessonTypesLessontypeid()` と同じフォームを再利用 |
| 削除 | `useDeleteLessonTypesLessontypeid()`。削除前に確認モーダルを表示 |
| フォーム | レッスン名、レベル、時間、レッスン料、有効状態 |
| 価格 | APIの`priceMinor`を日本円表示へ変換 |
| 状態 | APIの`isActive`を有効 / 停止中として表示 |

新規作成時はAPIが受け付ける`name`、`level`、`durationMinutes`、`priceMinor`、`currency`だけを送信する。編集時は`isActive`も含めて更新する。

### 17.8 Kubb生成物の扱い

`web/src/api/generated/` はOpenAPIからの生成物であり、手動編集しない。レッスン・講師・生徒APIを変更した場合は、APIサーバーを起動した状態で次を実行する。

```bash
pnpm --dir web generate:api
pnpm --dir web build:check
```

API変更後は次の操作を対象にする。

- healthz / readyz：2操作
- students：5操作（一覧、作成、詳細、更新、削除）
- teachers：5操作（一覧、作成、詳細、更新、削除）
- lessons：5操作（一覧、作成、詳細、更新、削除）
- lesson records：4操作（取得、作成、更新、削除）
- lesson types：5操作（一覧、作成、詳細、更新、削除）
- textbooks：5操作（一覧、作成、詳細、更新、削除）
- auth / me：5操作（ログイン選択肢、ログイン、ログアウト、現在ユーザー、担当生徒）

KubbはOpenAPI JSONファイルをリポジトリへ生成・保存せず、`API_OPENAPI_URL` または既定の `http://localhost:3000/api/v1/doc` から直接取得する。

## 18. API構成変更後の実装状況

### 実装済み

- KubbをAPI変更後のOpenAPI（38 schemas / 36 operations）から再生成
- `/login` を固定ユーザーのlocalStorage仮認証から、`/auth/demo/options`・`/auth/demo/login`を利用するAPIログインへ変更
- HttpOnlyセッションCookieを`/me`で復元するルートガードを追加
- ヘッダーのユーザー表示を`CurrentUser.role`に対応
- ログアウトを`POST /auth/logout`へ変更
- レッスンの講師・生徒を単数選択から複数選択へ変更し、`teacherIds` / `studentIds`を送信
- レッスン一覧・ダッシュボードで複数講師・複数生徒の表示名を解決
- レッスンの`record`有無を一覧の授業記録列へ表示し、スタッフには記録列を表示しない
- `representative` は生徒・講師管理と全レッスン操作を表示する
- `teacher` は担当生徒・自分のレッスン操作を表示する
- `staff` はスケジュール閲覧だけを表示し、レッスン記録を取得しない
- `/lessons/:lessonId` のレッスン詳細ページを追加
- 実施結果、実施日時、授業メモ、次回の課題を`LessonRecordForm.vue`で登録・編集
- 授業記録の削除と、保存後のレッスン詳細・記録再取得
- `completed` の場合は実施開始・終了日時を必須とし、終了日時が開始日時より後であることを画面側でも確認
- レッスンの期間検索・ページング用OpenAPI型を生成済み
- 授業記録CRUDの型・Fetchクライアント・Vue Query Composableを生成済み
- 教科書CRUDの型・Fetchクライアント・Vue Query Composableを生成済み
- レッスン情報（`lesson-types`）CRUDの型・Fetchクライアント・Vue Query Composableを生成済み
- 教科書一覧 `/textbooks` を実APIへ接続し、新規作成・編集・削除を実装
- レッスン情報一覧 `/lesson-prices` を実APIへ接続し、新規作成・編集・削除を実装
- 授業一覧 `/lessons` にタイトル検索、状態・講師・生徒フィルター、日時・タイトル・状態のソートを追加し、APIクエリへ反映
- 教科書・レッスン情報のフォームと削除確認モーダルをコンポーネント分離
- 顧客詳細の支払い記録に合計金額、授業料、教材費、支払い状態、利用状態を表示
- 支払い記録ごとに編集アイコンを表示し、クラス・教材・支払期限・請求状態・利用状態をモーダルから更新
- 支払い記録APIの`lessonIds`を基に、1件あたり5回分の消化状況をスタンプ表示
- 購入モーダルを`useGetLessonTypes()`、`useGetTextbooks()`、`usePostPaymentRecords()`へ接続
- 授業記録登録時の`PAYMENT_REQUIRED`を通知し、支払い記録不足時に完了できないことを表示
- 支払い記録ごとに請求書印刷ボタンを表示し、専用の印刷画面へ遷移
- 管理部（`representative`）専用の支払い分析ページ`/payment-reports`を追加し、全支払い記録のテーブルと月別・クラス別のグラフを表示
- 請求書は支払い記録の授業料、教材費、合計、請求先、発行者、振込先銀行情報を表示する。対象レッスン、生徒ID、支払い状況は表示しない
- `window.print()`によるブラウザ印刷／PDF保存に対応し、印刷時は操作バーを非表示

### 未実装・次の対応

1. `GET /me/students`を利用した講師向け担当生徒専用画面
2. 生徒・講師・レッスン一覧の検索、期間絞り込み、ページングUI
3. APIエラー表示、成功トースト、共通空状態のコンポーネント化
4. VitestとPlaywrightによる認証・主要CRUD導線のテスト

業務画面を追加しても、`App.vue` はアプリケーションシェルにとどめ、画面固有の処理は `pages/` と業務領域単位のコンポーネントへ分離する。

## 19. API・DB変更をフロントへ反映する設計

### 19.1 認証フロー（実装済み）

```text
/login
  ↓ GET /api/v1/auth/demo/options
講師を選択
  ↓ POST /api/v1/auth/demo/login
HttpOnly Cookieを受領
  ↓ GET /api/v1/me
現在ユーザー・ロールを保持
  ↓
業務画面へ遷移
```

実装方針：

- `LoginPage.vue` は講師一覧を取得し、セレクトで選択する。
- パスワード入力欄は表示できるが、デモAPIでは検証しない。
- 同一オリジンの`/api/v1`を利用するため、ブラウザのsame-origin Cookie送信でHttpOnlyセッションを維持する。別オリジンへ分離する場合はKubb fetchクライアントに`credentials: 'include'`を追加する。
- `401` を受けた場合はログイン画面へ戻す。
- `403` は権限不足として画面内に通知する。
- ユーザー情報とセッション復元は `useAuth` に集約し、各ページでCookieを直接扱わない。

### 19.2 レッスンデータの変更

レッスンの講師・生徒は単数ではなく配列を正とする。

```ts
type Lesson = {
  teacherIds: string[]
  studentIds: string[]
  // 移行期間中のみ互換フィールドとして存在する
  teacherId?: string
  studentId?: string
  record: LessonRecord | null
}
```

フロント側では、表示名解決用のMapを使って配列を表示する。

- 講師表示：複数名をカンマ区切り、またはタグで表示
- 生徒表示：複数名をカンマ区切り、または人数バッジで表示
- 作成・編集フォーム：講師・生徒ともNuxt UIの複数選択UIを使用
- 旧 `teacherId` / `studentId` は既存データ表示のフォールバックとしてのみ参照し、新規リクエストでは`teacherIds` / `studentIds`を送信する

### 19.3 授業記録・次回内容

レッスン一覧では `lesson.record` の有無を授業記録列に表示する。レッスン詳細では記録の登録・編集・削除を行う。

| UI | API |
| --- | --- |
| 授業記録表示 | `GET /lessons/:lessonId/record` またはレッスン詳細の `record` |
| 授業記録登録 | `POST /lessons/:lessonId/record` |
| 授業記録編集 | `PATCH /lessons/:lessonId/record` |
| 授業記録削除 | `DELETE /lessons/:lessonId/record` |

フォーム項目：

- 結果：実施、欠席、キャンセル
- 実施開始・終了日時：実施時のみ必須
- 授業メモ：`note`
- 次回内容：`nextContent`

保存成功後は、レッスン詳細Queryとレッスン一覧Queryをinvalidateして最新状態を再取得する。状態遷移の判定はAPIを正とし、フロントは入力補助にとどめる。

### 19.4 担当範囲と画面表示

- 講師画面の生徒一覧は `GET /me/students` を利用する。
- `GET /students/:studentId` は担当外なら403になるため、画面側で権限エラーを表示する。
- レッスン一覧はAPIが講師の参加レッスンだけを返すため、フロントで全件フィルタしない。
- `representative` は全件表示・操作できる。
- `teacher` は自分のレッスンと担当生徒だけ表示・操作できる。
- `staff` はスケジュールだけ表示でき、レッスン記録UIは表示しない。
- UIの表示切り替えは `/me.role` を基準にする。APIの403を必ず処理し、UI非表示だけで権限を保証しない。

### 19.5 API生成の更新手順

APIのOpenAPI定義を変更した場合は、次の順で反映する。

1. APIを起動する
2. `pnpm --dir web generate:api` を実行する
3. 生成された型とComposableを確認する
4. `src/api/generated/` は手動編集しない
5. `pnpm --dir web build:check` を実行する

今回のAPI変更で追加された主なComposableは、`useGetAuthDemoOptions`、`usePostAuthDemoLogin`、`usePostAuthLogout`、`useGetMe`、`useGetMeStudents`、授業記録CRUD、教科書CRUD、レッスン情報CRUD用Composableである。

## 20. 支払い・チケット画面

支払い記録とチケット消化はAPIを正とする。`StudentDetailPage.vue`は支払い記録、レッスン情報、教科書、対象生徒のレッスンをAPIから取得し、購入時は支払い記録を作成する。`useBillingMockData.ts`は旧モック実装として残っているが、現行画面では使用しない。

### 20.1 画面構成

| 画面 | パス | 内容 |
| --- | --- | --- |
| 顧客一覧 | `/students` | 生徒を顧客として一覧表示。氏名または詳細アイコンから詳細へ遷移 |
| 顧客詳細 | `/students/:studentId` | 顧客情報、チケット残数、支払い記録、チケット購入 |
| 教科書一覧 | `/textbooks` | `textbooks` APIによる教科書マスタCRUD |
| レッスン情報 | `/lesson-prices` | `lesson-types` APIによるレッスン料金マスタCRUD |

### 20.2 チケット購入ロジック

- 1件の支払い記録は5回分のレッスンとして扱う。
- 購入時に対象レッスン情報と、複数の教科書を選択する。
- 支払金額は「レッスン料 × 5回 + 教科書価格の合計」でAPI側が計算する。
- 購入ごとに生徒IDへ紐付く支払い記録を1件追加する。
- 支払い記録には、総回数、残り回数、支払い状態、利用状態、対象レッスンID、教科書IDを保持する。
- 支払い記録テーブルでは、合計金額、授業料、教材費、支払い状態、利用状態を表示する。
- 1件あたり5つのスタンプ枠を表示し、完了済みの枠はチェック印と実施日を表示する。
- スタンプはフロントから直接変更せず、担当講師が授業記録を登録した時にAPIが自動的に消化する。
- 支払い記録がない、または有効な残回数がない場合、授業記録の完了登録は`PAYMENT_REQUIRED`で拒否される。
- 支払い記録の残回数・利用状態はAPIレスポンスを表示し、フロントでは有効かつ入金済みの記録の残回数を合算する。

### 20.3 API接続済みマスタとの関係

- 購入モーダルは`useGetLessonTypes()`と`useGetTextbooks()`で取得したレッスン情報・教材を参照する。
- 教科書一覧は`GET/POST/PATCH/DELETE /textbooks`へ接続済みである。
- レッスン情報一覧は`GET/POST/PATCH/DELETE /lesson-types`へ接続済みである。
- 支払い記録は`GET/POST /payment-records`へ接続済みである。
- 価格は`priceMinor`を基準にし、表示時だけ通貨フォーマットへ変換する。
- 授業記録は`POST/PATCH /lessons/:lessonId/record`へ接続し、成功後にレッスン、授業記録、支払い記録を再取得する。
- 請求書画面は`GET /payment-records/:paymentRecordId`で支払い記録を取得し、フロントで請求書を組み立てる。請求書自体はDBへ保存しない。

### 20.3 将来のAPI・DB候補

- `textbooks`：教科書名、出版社、価格、販売状態
- `lesson_prices`：レッスン名、レベル、時間、レッスン料
- `payment_records`：顧客、購入日時、金額、入金状態、メモ
- `payment_record_lessons`：支払い記録とレッスンの紐付け
- `payment_record_textbooks`：支払い記録と教材の紐付け
- `payment_record_lessons`：支払い記録から実際に消化したレッスンの記録。授業記録登録時にAPIトランザクション内で追加される

