import HouseholdGate from "@/components/app/HouseholdGate";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen bg-secondary">
      <main className="h-svh flex flex-col">
        <HouseholdGate>{children}</HouseholdGate>
      </main>
    </div>
  );
}
