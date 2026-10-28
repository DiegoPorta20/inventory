export enum Role {
  ADMIN = 'ADMIN',
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}
