export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen">
      <main className="h-full flex p-4">{children}</main>
    </div>
  );
}
