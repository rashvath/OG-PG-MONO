export type Role = 'customer' | 'owner' | 'manager' | 'admin' | 'tenant'

export interface JwtPayload {
  sub: string
  role: Role
  ownerId?: string
  pgId?: string
}
