import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      full_name?: string
      username?: string
      is_admin?: boolean
    }
    accessToken: string
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    full_name?: string
    username?: string
    is_admin?: boolean
    accessToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    accessToken: string
  }
}