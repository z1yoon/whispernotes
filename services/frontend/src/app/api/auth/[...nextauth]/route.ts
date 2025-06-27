import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Always use the Docker service name when running in containers
          // Use environment variable or fallback to Docker service name
          const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:8000'
          
          // Use the correct login endpoint
          const response = await fetch(`${authServiceUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              username: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('Auth login failed:', response.status, errorData)
            
            // Check if this is a "user not found" error and suggest signup
            if (response.status === 401 && errorData.detail?.toLowerCase().includes('incorrect email or password')) {
              throw new Error('NO_ACCOUNT_FOUND')
            }
            
            // For other auth errors, throw the specific message
            throw new Error(errorData.detail || 'Authentication failed')
          }

          const data = await response.json()

          // Use the correct user profile endpoint
          const userResponse = await fetch(`${authServiceUrl}/api/v1/auth/me`, {
            headers: {
              'Authorization': `Bearer ${data.access_token}`,
            },
          })

          if (!userResponse.ok) {
            console.error('Failed to get user profile:', userResponse.status)
            return null
          }

          const user = await userResponse.json()

          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            role: user.is_admin ? 'admin' : 'user',
            accessToken: data.access_token,
          }
        } catch (error) {
          console.error('Auth error:', error)
          // Re-throw the error so it can be handled by the frontend
          throw error
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.role = user.role
        token.id = user.id  // Preserve user ID in token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user.role = token.role
      session.user.id = token.id  // Set user ID in session
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes (in seconds) - matches JWT_EXPIRE_MINUTES from .env
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }