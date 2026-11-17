export enum Role {
  ADMIN = 'ADMIN',
  PERSONAL = 'PERSONAL',
}

/** A user of one company. The company id comes from the signed token, never from the request. */
export interface AuthenticatedUser {
  id: number;
  companyId: number;
  email: string;
  name: string;
  role: Role;
}
