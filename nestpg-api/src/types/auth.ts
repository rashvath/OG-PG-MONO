export type Role = 'customer' | 'owner' | 'admin'

export interface JwtPayload {
  sub: string
  role: Role
}
