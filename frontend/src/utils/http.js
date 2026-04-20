import axios from 'axios';
import { ElMessage } from 'element-plus';
import { clearToken, getToken } from '@/utils/auth';
const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
});
http.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
http.interceptors.response.use((response) => {
    const payload = response.data;
    if (typeof payload?.code === 'number') {
        if (payload.code === 200) {
            return payload.data;
        }
        const message = payload.message || '请求失败';
        ElMessage.error(message);
        return Promise.reject(new Error(message));
    }
    return response.data;
}, (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message ||
        error.message ||
        '网络异常，请稍后重试';
    if (status === 401) {
        clearToken();
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    ElMessage.error(message);
    return Promise.reject(error);
});
export default http;
