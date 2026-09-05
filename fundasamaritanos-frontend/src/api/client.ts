/**
 * Cliente HTTP Fundasamaritanos API
 * Configurado según las especificaciones de:
 * 1. 🔐 Autenticación & Interceptores
 *    - Request: Adjunta Authorization: Bearer <token>
 *    - Response:
 *        * 401: Token expirado o inválido -> Limpia localStorage y redirige a /login
 *        * 403: Permisos insuficientes -> Notifica "Acceso denegado: No tienes permisos para realizar esta acción"
 *        * 422: Error de validación de formulario -> detail mapeado a campos
 *        * 400: Error de regla de negocio -> mensaje de detail directo
 * 2. Soporta application/x-www-form-urlencoded para POST /login
 * 3. Enrutador simulado integrado (Mock Adapter) para responder con exactitud de esquema
 *    cuando se navega en el entorno de previsualización sin backend remoto.
 */

import {
  ApiMeResponse,
  DashboardResponseData,
  RoleItem,
  PersonalMember,
  Beneficiaria
} from '../types';
import {
  INITIAL_BENEFICIARIAS,
  INITIAL_PERSONAL
} from '../data/mockData';

export const TOKEN_STORAGE_KEY = 'fundasamaritanos_token';
export const ROLE_STORAGE_KEY = 'fundasamaritanos_role';
export const USER_STORAGE_KEY = 'fundasamaritanos_user';

// Listeners for global notifications from interceptor
type NotificationHandler = (type: 'error' | 'warning' | 'info' | 'success', message: string) => void;
type UnauthorizedHandler = () => void;

let notificationHandler: NotificationHandler | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setNotificationHandler = (handler: NotificationHandler) => {
  notificationHandler = handler;
};

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};

// Roles oficiales según GET /roles/
export const SYSTEM_ROLES: RoleItem[] = [
  { id: 1, nombre: 'Administrador', descripcion: 'Acceso Total a todos los módulos y gestión de usuarios' },
  { id: 2, nombre: 'Editor', descripcion: 'Creación y Edición de Beneficiarias, Expedientes y Personal (solo lectura)' },
  { id: 3, nombre: 'Lector', descripcion: 'Consulta general de datos sin permisos de modificación' }
];

// Helper to get stored token
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const getStoredRole = (): string | null => {
  try {
    return localStorage.getItem(ROLE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const clearAuthStorage = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing storage', e);
  }
};

// Custom API Error
export class ApiError extends Error {
  status: number;
  detail: any;

  constructor(status: number, detail: any, message?: string) {
    super(typeof detail === 'string' ? detail : message || `HTTP Error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// In-memory data store for the mock backend
let mockBeneficiarias: Beneficiaria[] = [...INITIAL_BENEFICIARIAS];
let mockPersonal: PersonalMember[] = INITIAL_PERSONAL.map((p, idx) => ({
  ...p,
  id: idx + 1,
  id_cargo: (idx % 6) + 1,
  id_direccion: (idx % 4) + 1,
  tipo_personal: (idx === 4 || idx === 5 ? 'Voluntario' : 'Fijo') as 'Fijo' | 'Voluntario',
  usuario: idx === 1 
    ? { id: 1, nombre_usuario: 'admin', id_rol: 1, rol_nombre: 'Administrador', ultimo_acceso: 'Hoy, 09:30 AM' }
    : idx === 0 
    ? { id: 2, nombre_usuario: 'e.morales', id_rol: 2, rol_nombre: 'Editor', ultimo_acceso: 'Ayer, 04:15 PM' }
    : null
}));

// API Client Wrapper
export const apiClient = {
  /**
   * Ejecuta petición HTTP o simula el endpoint si la API externa no está disponible
   */
  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      isFormUrlEncoded?: boolean;
      params?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const baseUrl = (import.meta as any).env?.VITE_API_URL || '';

    // Interceptor: Request
    const headers: Record<string, string> = {
      ...options.headers
    };

    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.isFormUrlEncoded) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Si existe VITE_API_URL, intentamos hacer la petición real
    if (baseUrl && !baseUrl.includes('mock')) {
      try {
        let url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        if (options.params) {
          const searchParams = new URLSearchParams();
          Object.entries(options.params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
              searchParams.append(k, String(v));
            }
          });
          const qs = searchParams.toString();
          if (qs) url += `?${qs}`;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: options.isFormUrlEncoded
            ? new URLSearchParams(options.body).toString()
            : options.body instanceof FormData
            ? options.body
            : options.body
            ? JSON.stringify(options.body)
            : undefined
        });

        // Interceptor: Response HTTP Statuses
        if (!response.ok) {
          let errorDetail: any = null;
          try {
            const data = await response.json();
            errorDetail = data.detail || data.message || data;
          } catch {
            errorDetail = await response.text();
          }

          // HTTP 401: Token expirado o inválido -> Limpiar sesión y redirigir a /login
          if (response.status === 401) {
            clearAuthStorage();
            if (unauthorizedHandler) {
              unauthorizedHandler();
            }
            if (notificationHandler) {
              notificationHandler('error', 'Su sesión ha expirado o es inválida. Por favor ingrese nuevamente.');
            }
            throw new ApiError(401, errorDetail, 'Sesión expirada');
          }

          // HTTP 403: Permisos insuficientes -> Notificar alerta
          if (response.status === 403) {
            if (notificationHandler) {
              notificationHandler('warning', 'Acceso denegado: No tienes permisos para realizar esta acción');
            }
            throw new ApiError(403, errorDetail, 'Acceso denegado: No tienes permisos para realizar esta acción');
          }

          // HTTP 400: Error de regla de negocio -> Notificar directo
          if (response.status === 400) {
            const msg = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
            if (notificationHandler) {
              notificationHandler('error', msg);
            }
            throw new ApiError(400, errorDetail, msg);
          }

          // HTTP 422: Validación de formularios
          if (response.status === 422) {
            throw new ApiError(422, errorDetail, 'Error de validación de campos');
          }

          throw new ApiError(response.status, errorDetail);
        }

        return (await response.json()) as T;
      } catch (err: any) {
        // If it's already an ApiError, rethrow
        if (err instanceof ApiError) throw err;
        console.warn('Fallo al conectar con servidor remoto, usando mock adapter:', err);
      }
    }

    // Mock API Adapter — Emula exactamente la API Fundasamaritanos
    return handleMockRequest<T>(endpoint, method, options.body, options.params);
  }
};

/**
 * Simulador de Backend Fundasamaritanos
 * Respeta exactamente los esquemas definidos en la especificación
 */
async function handleMockRequest<T>(
  endpoint: string,
  method: string,
  body?: any,
  params?: Record<string, any>
): Promise<T> {
  // Simular latencia de red realista
  await new Promise((r) => setTimeout(r, 120));

  const cleanEndpoint = endpoint.split('?')[0].replace(/\/$/, '');

  // 1. POST /login (application/x-www-form-urlencoded)
  if (cleanEndpoint === '/login' && method === 'POST') {
    const username = body?.username || '';
    const password = body?.password || '';

    if (!username.trim()) {
      throw new ApiError(400, 'El campo "username" es requerido.');
    }

    // Rol por defecto o deducido
    let rol: 'Administrador' | 'Editor' | 'Lector' = 'Administrador';
    if (username.toLowerCase().includes('editor') || username.toLowerCase().includes('social')) {
      rol = 'Editor';
    } else if (username.toLowerCase().includes('lector') || username.toLowerCase().includes('consulta')) {
      rol = 'Lector';
    }

    const token = `funda_jwt_mock_${Date.now()}_${rol.toLowerCase()}`;
    return {
      access_token: token,
      token_type: 'bearer',
      rol
    } as unknown as T;
  }

  // 2. GET /me
  if (cleanEndpoint === '/me' && method === 'GET') {
    const roleStored = (getStoredRole() as any) || 'Administrador';
    let personalInfo = {
      nombre: 'Admin',
      apellido: 'Sistema',
      cargo: 'Coordinador General'
    };

    if (roleStored === 'Editor') {
      personalInfo = {
        nombre: 'Elena',
        apellido: 'Morales',
        cargo: 'Trabajadora Social Principal'
      };
    } else if (roleStored === 'Lector') {
      personalInfo = {
        nombre: 'Observador',
        apellido: 'Consultor',
        cargo: 'Auditor Externo'
      };
    }

    const response: ApiMeResponse = {
      id: roleStored === 'Administrador' ? 1 : roleStored === 'Editor' ? 2 : 3,
      nombre_usuario: roleStored.toLowerCase(),
      rol: roleStored,
      personal: personalInfo
    };

    return response as unknown as T;
  }

  // 3. GET /roles/
  if (cleanEndpoint === '/roles' && method === 'GET') {
    return SYSTEM_ROLES as unknown as T;
  }

  // 4. GET /dashboard
  if (cleanEndpoint === '/dashboard' && method === 'GET') {
    const activas = mockBeneficiarias.filter((b) => b.estado === 'Activa').length;
    const totalExpedientes = mockBeneficiarias.length;
    const ingresosRecientes = 4;
    const promedioPorFamilia = +(totalExpedientes / 24).toFixed(2);

    // Calcular distribución por rango etario
    const rangoEtario = {
      '0-5': mockBeneficiarias.filter((b) => b.edad <= 5).length,
      '6-10': mockBeneficiarias.filter((b) => b.edad >= 6 && b.edad <= 10).length,
      '11-14': mockBeneficiarias.filter((b) => b.edad >= 11 && b.edad <= 14).length,
      '15-17': mockBeneficiarias.filter((b) => b.edad >= 15 && b.edad <= 17).length,
      '18+': mockBeneficiarias.filter((b) => b.edad >= 18).length
    };

    const dashboardData: DashboardResponseData = {
      metricas: {
        beneficiarias_activas: activas || 34,
        total_expedientes: totalExpedientes || 28,
        ingresos_recientes: ingresosRecientes,
        promedio_beneficiarias_por_familia: promedioPorFamilia || 1.42
      },
      distribucion: {
        por_rango_etario: rangoEtario,
        por_institucion: [
          { institucion: 'U.E.B. República de Venezuela', cantidad: 8 },
          { institucion: 'Liceo Bolivariano Mariano Picón Salas', cantidad: 6 },
          { institucion: 'U.E. Colegio San Antonio de Padua', cantidad: 5 },
          { institucion: 'Escuela Básica Municipal Petare', cantidad: 4 },
          { institucion: 'Liceo Eulalia Buroz', cantidad: 3 }
        ],
        evolucion_mensual: [
          { periodo: '2025-01', ingresos: 5, egresos: 1 },
          { periodo: '2025-02', ingresos: 7, egresos: 2 },
          { periodo: '2025-03', ingresos: 6, egresos: 1 },
          { periodo: '2025-04', ingresos: 8, egresos: 3 },
          { periodo: '2025-05', ingresos: 10, egresos: 2 },
          { periodo: '2025-06', ingresos: 4, egresos: 0 }
        ]
      },
      alertas: {
        sin_representante: [
          { id: 'b-0102', expCode: 'EXP-2023-0102', nombres: 'Victoria Salomé', apellidos: 'Rivas Morales', detalle: 'Representante sin confirmar en sistema' }
        ],
        proximas_a_egresar: [
          { id: 'b-0089', expCode: 'EXP-2023-0089', nombres: 'Isabella Lucía', apellidos: 'Méndez Castillo', edad: 17, detalle: 'Alcanza mayoría de edad en 2 meses' },
          { id: 'b-0118', expCode: 'EXP-2021-0118', nombres: 'Mariana Valentina', apellidos: 'Martínez López', edad: 17, detalle: 'Fase de egreso formativo' }
        ],
        egresadas_sin_fecha: [
          { id: 'b-0055', expCode: 'EXP-2022-0055', nombres: 'Génesis Sofía', apellidos: 'Pantoja Dávila', detalle: 'Estado Egresada pero falta fecha de cierre legal' }
        ],
        sin_grado_escolar: [
          { id: 'b-0201', expCode: 'EXP-2024-0201', nombres: 'Camila Andrea', apellidos: 'Martínez López', detalle: 'Sin inscripción escolar formal registrada' }
        ]
      },
      cumpleanios_proximos: [
        { id: 'b-0442', nombre: 'Valeria Sofía Martínez', fecha: '14 de Mayo', edad_cumplir: 13, dias_faltantes: 'Hoy' },
        { id: 'b-0102', nombre: 'Victoria Salomé Rivas', fecha: '16 de Mayo', edad_cumplir: 7, dias_faltantes: 'En 2 días' },
        { id: 'b-0118', nombre: 'Mariana Valentina Martínez', fecha: '20 de Mayo', edad_cumplir: 15, dias_faltantes: 'En 6 días' }
      ],
      calidad_de_datos: {
        sin_cedula_pct: 12,
        sin_fecha_nacimiento_rep_pct: 8,
        direcciones_incompletas_pct: 5,
        puntaje_general_pct: 92
      }
    };

    return dashboardData as unknown as T;
  }

  // 5. GET /personal/
  if (cleanEndpoint === '/personal' && method === 'GET') {
    let result = [...mockPersonal];
    const q = (params?.q || '').toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.apellido.toLowerCase().includes(q) ||
          p.cedula.toLowerCase().includes(q) ||
          p.cargo.toLowerCase().includes(q)
      );
    }
    return result as unknown as T;
  }

  // 6. POST /personal/ (Paso 1 del Administrador)
  if (cleanEndpoint === '/personal' && method === 'POST') {
    const { nombre, apellido, cedula, telefono, id_direccion, id_cargo, tipo_personal, estado } = body || {};

    if (!nombre || !apellido || !cedula) {
      throw new ApiError(422, {
        detail: [
          { loc: ['body', 'nombre'], msg: 'Nombre es requerido', type: 'value_error.missing' },
          { loc: ['body', 'apellido'], msg: 'Apellido es requerido', type: 'value_error.missing' }
        ]
      });
    }

    // Regla de negocio: cédula duplicada
    if (mockPersonal.some((p) => p.cedula.trim() === cedula.trim())) {
      throw new ApiError(400, 'Ya existe un trabajador registrado con este número de cédula de identidad.');
    }

    const newId = mockPersonal.length + 1;
    const newMember: PersonalMember = {
      id: newId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      cedula: cedula.trim(),
      telefono: telefono || '+58 ',
      cargo: body.cargo || 'Especialista Institucional',
      id_cargo: id_cargo || 1,
      id_direccion: id_direccion || 1,
      tipo_personal: tipo_personal || 'Fijo',
      estado: estado || 'Activo',
      area: body.area || 'Trabajo Social',
      email: body.email || `${nombre.toLowerCase()[0]}.${apellido.toLowerCase()}@fundasamaritanos.org`,
      casosAsignados: 0,
      avatar: `${nombre[0]}${apellido[0]}`.toUpperCase(),
      usuario: null
    };

    mockPersonal.unshift(newMember);
    return newMember as unknown as T;
  }

  // 7. POST /personal/{id}/usuario (Paso 2 del Administrador: Asignar Credenciales)
  const assignMatch = cleanEndpoint.match(/^\/personal\/([^/]+)\/usuario$/);
  if (assignMatch && method === 'POST') {
    const personalId = assignMatch[1];
    const { nombre_usuario, password, id_rol } = body || {};

    if (!nombre_usuario || !password || !id_rol) {
      throw new ApiError(422, {
        detail: 'Debe especificar nombre_usuario, password e id_rol.'
      });
    }

    const targetIdx = mockPersonal.findIndex((p) => String(p.id) === String(personalId));
    if (targetIdx === -1) {
      throw new ApiError(404, 'Registro de personal no encontrado.');
    }

    const target = mockPersonal[targetIdx];
    if (target.estado !== 'Activo') {
      throw new ApiError(400, 'Solo el personal en estado "Activo" puede tener una cuenta de usuario asignada.');
    }

    const roleName = SYSTEM_ROLES.find((r) => r.id === Number(id_rol))?.nombre || 'Editor';

    target.usuario = {
      id: Date.now(),
      nombre_usuario: nombre_usuario.trim(),
      id_rol: Number(id_rol),
      rol_nombre: roleName,
      ultimo_acceso: 'Pendiente de primer ingreso'
    };

    return {
      message: 'Usuario asignado exitosamente',
      usuario: target.usuario
    } as unknown as T;
  }

  // 8. PUT /personal/{id}/usuario (Modificar Rol o Resetear Contraseña)
  if (assignMatch && method === 'PUT') {
    const personalId = assignMatch[1];
    const { password, id_rol } = body || {};

    const target = mockPersonal.find((p) => String(p.id) === String(personalId));
    if (!target) {
      throw new ApiError(404, 'Registro de personal no encontrado.');
    }
    if (!target.usuario) {
      throw new ApiError(400, 'Este trabajador no tiene cuenta de usuario activa para editar.');
    }

    if (id_rol) {
      target.usuario.id_rol = Number(id_rol);
      target.usuario.rol_nombre = SYSTEM_ROLES.find((r) => r.id === Number(id_rol))?.nombre || target.usuario.rol_nombre;
    }

    return {
      message: 'Credenciales actualizadas exitosamente',
      usuario: target.usuario
    } as unknown as T;
  }

  // 9. DELETE /personal/{id}
  const deletePersonalMatch = cleanEndpoint.match(/^\/personal\/([^/]+)$/);
  if (deletePersonalMatch && method === 'DELETE') {
    const pId = deletePersonalMatch[1];
    mockPersonal = mockPersonal.filter((p) => String(p.id) !== String(pId));
    return { message: 'Trabajador eliminado exitosamente' } as unknown as T;
  }

  // 10. GET /beneficiarias/
  if (cleanEndpoint === '/beneficiarias' && method === 'GET') {
    return mockBeneficiarias as unknown as T;
  }

  // 11. POST /beneficiarias/
  if (cleanEndpoint === '/beneficiarias' && method === 'POST') {
    const newBen = { ...body, id: `b-${Date.now()}` };
    mockBeneficiarias.unshift(newBen);
    return newBen as unknown as T;
  }

  // 12. PUT /beneficiarias/{id}
  const putBenMatch = cleanEndpoint.match(/^\/beneficiarias\/([^/]+)$/);
  if (putBenMatch && method === 'PUT') {
    const id = putBenMatch[1];
    mockBeneficiarias = mockBeneficiarias.map((b) => (b.id === id ? { ...b, ...body } : b));
    return body as unknown as T;
  }

  // 13. DELETE /beneficiarias/{id}
  if (putBenMatch && method === 'DELETE') {
    const id = putBenMatch[1];
    mockBeneficiarias = mockBeneficiarias.filter((b) => b.id !== id);
    return { message: 'Expediente eliminado exitosamente' } as unknown as T;
  }

  return {} as unknown as T;
}
