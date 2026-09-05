/**
 * Servicios de API Fundasamaritanos
 * Mapeo directo y tipado de todos los endpoints especificados
 */

import { apiClient } from './client';
import {
  ApiMeResponse,
  DashboardResponseData,
  RoleItem,
  PersonalMember,
  Beneficiaria
} from '../types';

export const authApi = {
  /**
   * POST /login (application/x-www-form-urlencoded)
   */
  login: async (username: string, password: string): Promise<{ access_token: string; token_type: string; rol: 'Administrador' | 'Editor' | 'Lector' }> => {
    return apiClient.request('/login', {
      method: 'POST',
      isFormUrlEncoded: true,
      body: {
        username,
        password
      }
    });
  },

  /**
   * GET /me (con cabecera Authorization: Bearer <token>)
   */
  getMe: async (): Promise<ApiMeResponse> => {
    return apiClient.request('/me', {
      method: 'GET'
    });
  }
};

export const dashboardApi = {
  /**
   * GET /dashboard (Mapeo completo de data.metricas, data.distribucion, data.alertas, data.cumpleanios_proximos, data.calidad_de_datos)
   */
  getDashboard: async (): Promise<DashboardResponseData> => {
    return apiClient.request('/dashboard', {
      method: 'GET'
    });
  }
};

export const rolesApi = {
  /**
   * GET /roles/
   * Devuelve Administrador=1, Editor=2, Lector=3
   */
  list: async (): Promise<RoleItem[]> => {
    return apiClient.request('/roles', {
      method: 'GET'
    });
  }
};

export const personalApi = {
  /**
   * GET /personal
   */
  list: async (params?: { skip?: number; limit?: number; order_by?: string; order_dir?: 'asc' | 'desc'; q?: string; estado?: string }): Promise<PersonalMember[]> => {
    return apiClient.request('/personal', {
      method: 'GET',
      params
    });
  },

  /**
   * POST /personal/ (Paso 1 de creación de personal)
   */
  create: async (data: {
    nombre: string;
    apellido: string;
    cedula: string;
    telefono: string;
    id_direccion?: number;
    id_cargo?: number;
    cargo?: string;
    area?: string;
    tipo_personal: 'Fijo' | 'Voluntario';
    estado: 'Activo' | 'Inactivo' | 'Vacaciones' | 'Permiso';
  }): Promise<PersonalMember> => {
    return apiClient.request('/personal', {
      method: 'POST',
      body: data
    });
  },

  /**
   * POST /personal/{personal_id}/usuario (Paso 2: Asignar Credenciales)
   */
  assignUsuario: async (
    personalId: number | string,
    data: {
      nombre_usuario: string;
      password: string;
      personal_id: number;
      id_rol: number;
    }
  ): Promise<{ message: string; usuario: any }> => {
    return apiClient.request(`/personal/${personalId}/usuario`, {
      method: 'POST',
      body: data
    });
  },

  /**
   * PUT /personal/{personal_id}/usuario (Modificar Rol o Resetear Contraseña)
   */
  updateUsuario: async (
    personalId: number | string,
    data: {
      password?: string;
      id_rol?: number;
    }
  ): Promise<{ message: string; usuario: any }> => {
    return apiClient.request(`/personal/${personalId}/usuario`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * DELETE /personal/{id} (Solo Administrador)
   */
  delete: async (personalId: number | string): Promise<{ message: string }> => {
    return apiClient.request(`/personal/${personalId}`, {
      method: 'DELETE'
    });
  }
};

export const beneficiariasApi = {
  /**
   * GET /beneficiarias
   */
  list: async (params?: Record<string, any>): Promise<Beneficiaria[]> => {
    return apiClient.request('/beneficiarias', {
      method: 'GET',
      params
    });
  },

  /**
   * POST /beneficiarias/
   */
  create: async (data: Partial<Beneficiaria>): Promise<Beneficiaria> => {
    return apiClient.request('/beneficiarias', {
      method: 'POST',
      body: data
    });
  },

  /**
   * PUT /beneficiarias/{id}
   */
  update: async (id: string, data: Partial<Beneficiaria>): Promise<Beneficiaria> => {
    return apiClient.request(`/beneficiarias/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * DELETE /beneficiarias/{id}
   */
  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.request(`/beneficiarias/${id}`, {
      method: 'DELETE'
    });
  }
};
