import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
