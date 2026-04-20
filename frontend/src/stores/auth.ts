import { defineStore } from 'pinia'

import http from '@/utils/http'
import { clearToken, getToken, setToken } from '@/utils/auth'

function resolveDisplayName(user: UserProfile | null) {
  const realName = user?.real_name?.trim() || ''
  if (realName && !/^[?？�]+$/.test(realName)) {
    return realName
  }
  return user?.username || '未登录用户'
}

type UserProfile = {
  id: number
  username: string
  email?: string
  phone?: string
  real_name?: string
  role: number
  status: number
  ctime?: number
  mtime?: number
}

type Permission = string

type LoginPayload = {
  token: string
  user: UserProfile
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: null as UserProfile | null,
    permissions: [] as Permission[],
    loaded: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    displayName: (state) => resolveDisplayName(state.user),
  },
  actions: {
    setSession(token: string, user: UserProfile | null) {
      this.token = token
      this.user = user
      this.loaded = Boolean(user)
      if (token) {
        setToken(token)
      } else {
        clearToken()
      }
    },
    clearSession() {
      this.token = ''
      this.user = null
      this.permissions = []
      this.loaded = false
      clearToken()
    },
    async login(form: { username: string; password: string }) {
      const data = await http.post<never, LoginPayload>('/auth/login', form)
      this.setSession(data.token, data.user)
      await this.fetchPermissions()
      return data
    },
    async fetchProfile() {
      const profile = await http.get<never, UserProfile>('/profile')
      this.user = profile
      return profile
    },
    async fetchPermissions() {
      const data = await http.get<never, { permissions: Permission[] }>('/permissions')
      this.permissions = data.permissions || []
      return this.permissions
    },
    async bootstrap() {
      if (!this.token) {
        this.clearSession()
        return
      }

      if (this.loaded && this.user) {
        return
      }

      try {
        await this.fetchProfile()
        await this.fetchPermissions()
        this.loaded = true
      } catch {
        this.clearSession()
      }
    },
  },
})

