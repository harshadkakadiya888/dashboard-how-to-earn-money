import axios from 'axios';
import { toast } from 'sonner';

const apiClient = axios.create({
    // Empty uses same origin so Vite dev proxy can forward /api → Django (see vite.config.ts).
    baseURL: import.meta.env.VITE_BASE_URL ?? '',
    headers: {
        'Content-Type': 'application/json',
    }
});

apiClient.interceptors.response.use(
    response => response,
    error => {
        const message = error.response?.data?.message || error.message || 'An unknown error occurred';
        toast.error(message);
        return Promise.reject(error);
    }
);

export const get = async <T>(url: string, params?: object): Promise<T> => {
    const response = await apiClient.get<T>(url, { params });
    return response.data;
};

// We can add post, put, delete methods here as well
// For example:
/*
export const post = async <T>(url: string, data: object): Promise<T> => {
    const response = await apiClient.post<T>(url, data);
    return response.data;
};
*/

export default apiClient; 