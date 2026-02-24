export type UserRoleName = "admin" | "vendedor";

export interface Rol {
  id: number;
  nombre: UserRoleName | string;
  descripcion?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email?: string | null;
  is_active: boolean;
  creado_en: string;
  rol: Rol;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}

export interface RegisterRequest {
  nombre: string;
  email?: string;
  password: string;
}
