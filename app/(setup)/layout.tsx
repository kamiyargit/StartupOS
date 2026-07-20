export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 dark:bg-gh-canvas">{children}</div>;
}
