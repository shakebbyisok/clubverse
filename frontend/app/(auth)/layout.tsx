export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth pages don't need the header
  return <>{children}</>
}

