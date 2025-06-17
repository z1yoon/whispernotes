import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up - Whisper Notes',
  description: 'Request access to Whisper Notes AI transcription platform',
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}