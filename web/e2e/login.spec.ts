import { expect, test } from '@playwright/test'

type DemoRole = 'representative' | 'staff' | 'teacher'

type DemoUser = {
  displayName: string
  role: DemoRole
  userId: string
}

const representative: DemoUser = {
  userId: '00000000-0000-4000-8000-000000000001',
  displayName: '鈴木 一郎',
  role: 'representative',
}

const staff: DemoUser = {
  userId: '00000000-0000-4000-8000-000000000002',
  displayName: '高橋 美咲',
  role: 'staff',
}

function toCurrentUser(user: DemoUser) {
  return {
    id: user.userId,
    displayName: user.displayName,
    email: `${user.role}@example.test`,
    role: user.role,
    teacherId: user.role === 'teacher' ? '00000000-0000-4000-8000-000000000003' : null,
    staffMemberId: user.role === 'staff' ? '00000000-0000-4000-8000-000000000004' : null,
  }
}

async function mockApi(page: import('@playwright/test').Page, sessionUser: DemoUser | null) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname

    if (pathname.endsWith('/auth/demo/options')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [representative, staff] }) })
      return
    }

    if (pathname.endsWith('/auth/demo/login') && request.method() === 'POST') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: toCurrentUser(representative) }),
      })
      return
    }

    if (pathname.endsWith('/me')) {
      if (sessionUser) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: toCurrentUser(sessionUser) }),
        })
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        })
      }
      return
    }

    if (pathname.endsWith('/dashboard/alerts')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { noRecentLessons: [], overduePayments: [], upcomingBirthdays: [] } }),
      })
      return
    }

    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  })
}

test('ログイン画面でデモ利用者の選択とログイン操作を表示する', async ({ page }) => {
  await mockApi(page, null)

  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
  await expect(page.getByText('デモ環境')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
})

test('デモログイン後にダッシュボードへ遷移する', async ({ page }) => {
  await mockApi(page, null)

  await page.goto('/login')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
})

test('未ログインで保護された生徒一覧を開くとログイン画面へ遷移する', async ({ page }) => {
  await mockApi(page, null)

  await page.goto('/students')

  await expect(page).toHaveURL(/\/login\?redirect=\/students/)
  await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible()
})

test('スタッフは支払い記録画面を開けない', async ({ page }) => {
  await mockApi(page, staff)

  await page.goto('/payment-reports')

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
})
