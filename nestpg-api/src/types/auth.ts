export type Role = 'customer' | 'owner' | 'admin' | 'tenant'

export interface JwtPayload {
  sub: string
  role: Role
}
