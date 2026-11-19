import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    print?: boolean
    permission?: 'viewStudents' | 'viewTeachers' | 'viewCatalog' | 'manageTeachers' | 'viewPaymentData'
  }
}

export {}
