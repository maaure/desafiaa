// Derived from backend src/modules/auth/auth.schema.ts

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  /** Foto do perfil — presente quando a conta veio do Google */
  avatarUrl: string | null;
  createdAt: string;
}
