export type ViewMode = 
  | 'login' 
  | 'dashboard' 
  | 'beneficiarias' 
  | 'nuevo-expediente' 
  | 'ficha-beneficiaria' 
  | 'personal' 
  | 'configuracion';

export type AppRole = 'Administrador' | 'Editor' | 'Lector';

export interface UserPersonal {
  nombre: string;
  apellido: string;
  cargo: string;
}

export interface ApiMeResponse {
  id: number;
  nombre_usuario: string;
  rol: AppRole;
  personal: UserPersonal;
}

export interface RoleItem {
  id: number;
  nombre: AppRole;
  descripcion: string;
}

export interface CargoItem {
  id: number;
  nombre: string;
  area: 'Dirección' | 'Trabajo Social' | 'Psicología' | 'Educación' | 'Administración' | 'Salud';
}

export interface DireccionItem {
  id: number;
  ciudad: string;
  municipio: string;
  estado: string;
  detalle: string;
}

export interface PersonalUsuarioCredentials {
  id?: number;
  nombre_usuario: string;
  id_rol: number;
  rol_nombre?: AppRole;
  ultimo_acceso?: string;
}

export type BeneficiariaStatus = 'Activa' | 'Trasladada' | 'Egresada';
export type ExpedientePriority = 'Normal' | 'Media' | 'Urgente';
export type ExpedienteType = 'Protección Integral' | 'Apoyo Educativo' | 'Salud y Nutrición' | 'Emergencia Social';

export interface Representante {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  parentesco: 'Madre' | 'Padre' | 'Abuela' | 'Abuelo' | 'Tía' | 'Tío' | 'Hermano(a) Mayor' | 'Tutor Legal';
  telefono: string;
  ocupacion: string;
  estadoCivil: string;
  nivelInstruccion: string;
  direccion: string;
}

export interface Beneficiaria {
  id: string;
  expCode: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  lugarNacimiento: string;
  fechaNacimiento: string;
  edad: number; // API precomputed
  direccion: string;
  institucionEducativa: string;
  grado: string;
  estado: BeneficiariaStatus;
  fechaIngreso: string;
  fechaEgreso?: string | null;
  tipoExpediente: ExpedienteType;
  prioridad: ExpedientePriority;
  institucionRemite: string;
  observaciones: string;
  representantePrincipal: string;
  representantes: Representante[];
  hermanasIds: string[];
  avatarBg?: string;
}

export interface PersonalMember {
  id: string | number;
  nombre: string;
  apellido: string;
  cargo: string;
  id_cargo?: number;
  area: 'Dirección' | 'Trabajo Social' | 'Psicología' | 'Educación' | 'Administración' | 'Salud';
  email: string;
  telefono: string;
  cedula: string;
  id_direccion?: number;
  tipo_personal: 'Fijo' | 'Voluntario';
  estado: 'Activo' | 'Inactivo' | 'Vacaciones' | 'Permiso';
  casosAsignados: number;
  avatar: string;
  usuario?: PersonalUsuarioCredentials | null;
}

export interface ActividadLog {
  id: string;
  usuario: string;
  rol: string;
  accion: string;
  detalle: string;
  expCode?: string;
  tiempo: string;
  tipo: 'update' | 'create' | 'visit' | 'alert';
}

export interface AppConfig {
  organizacion: string;
  rif: string;
  email: string;
  telefono: string;
  direccion: string;
  prefijoExp: string;
  vincularHermanasAuto: boolean;
  alertaCumpleanos: boolean;
  tiempoInactividad: string;
}

/* ================== API DASHBOARD JSON SCHEMA ================== */
export interface DashboardAlertItem {
  id: string;
  expCode: string;
  nombres: string;
  apellidos: string;
  edad?: number;
  detalle?: string;
}

export interface DashboardBirthdayItem {
  id: string;
  nombre: string;
  fecha: string;
  edad_cumplir: number;
  dias_faltantes: string; // "Hoy", "En 2 días", "En 5 días"
}

export interface DashboardResponseData {
  metricas: {
    beneficiarias_activas: number;
    total_expedientes: number;
    ingresos_recientes: number;
    promedio_beneficiarias_por_familia: number;
  };
  distribucion: {
    por_rango_etario: {
      '0-5': number;
      '6-10': number;
      '11-14': number;
      '15-17': number;
      '18+': number;
    };
    por_institucion: {
      institucion: string;
      cantidad: number;
    }[];
    evolucion_mensual: {
      periodo: string; // "2025-04", "2025-05"
      ingresos: number;
      egresos: number;
    }[];
  };
  alertas: {
    sin_representante: DashboardAlertItem[];
    proximas_a_egresar: DashboardAlertItem[];
    egresadas_sin_fecha: DashboardAlertItem[];
    sin_grado_escolar: DashboardAlertItem[];
  };
  cumpleanios_proximos: DashboardBirthdayItem[];
  calidad_de_datos: {
    sin_cedula_pct: number;
    sin_fecha_nacimiento_rep_pct: number;
    direcciones_incompletas_pct: number;
    puntaje_general_pct: number;
  };
}
