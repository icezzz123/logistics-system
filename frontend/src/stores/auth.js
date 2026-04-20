import { defineStore } from 'pinia';
import http from '@/utils/http';
import { clearToken, getToken, setToken } from '@/utils/auth';
function resolveDisplayName(user) {
    const realName = user?.real_name?.trim() || '';
    if (realName && !/^[?？�]+$/.test(realName)) {
        return realName;
    }
    return user?.username || '未登录用户';
}
export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: getToken(),
        user: null,
        permissions: [],
        loaded: false,
    }),
    getters: {
        isAuthenticated: (state) => Boolean(state.token),
        displayName: (state) => resolveDisplayName(state.user),
    },
    actions: {
        setSession(token, user) {
            this.token = token;
            this.user = user;
            this.loaded = Boolean(user);
            if (token) {
                setToken(token);
            }
            else {
                clearToken();
            }
        },
        clearSession() {
            this.token = '';
            this.user = null;
            this.permissions = [];
            this.loaded = false;
            clearToken();
        },
        async login(form) {
            const data = await http.post('/auth/login', form);
            this.setSession(data.token, data.user);
            await this.fetchPermissions();
            return data;
        },
        async fetchProfile() {
            const profile = await http.get('/profile');
            this.user = profile;
            return profile;
        },
        async fetchPermissions() {
            const data = await http.get('/permissions');
            this.permissions = data.permissions || [];
            return this.permissions;
        },
        async bootstrap() {
            if (!this.token) {
                this.clearSession();
                return;
            }
            if (this.loaded && this.user) {
                return;
            }
            try {
                await this.fetchProfile();
                await this.fetchPermissions();
                this.loaded = true;
            }
            catch {
                this.clearSession();
            }
        },
    },
});
