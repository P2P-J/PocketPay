export function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
