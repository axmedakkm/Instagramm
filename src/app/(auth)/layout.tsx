export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aurora flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-10">
      {children}
    </div>
  );
}
