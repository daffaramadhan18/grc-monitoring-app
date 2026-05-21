import NextAuth, { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: number
      username: string
      role: string
      mustChangePassword: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: number
    username: string
    role: string
    mustChangePassword: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: number
    username: string
    role: string
    mustChangePassword: boolean
  }
}
