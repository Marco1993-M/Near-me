"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    ),
  },
  {
    href: "/top",
    label: "Saved",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12.1 20.3 4.9 13a4.9 4.9 0 1 1 6.9-6.9l.2.2.2-.2A4.9 4.9 0 1 1 19.1 13l-7.2 7.3Z" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = pathname ?? "/";
  const isMapHome = normalizedPathname === "/";
  const isOverlayRoute = isMapHome || normalizedPathname.startsWith("/cafes/");

  return (
    <div className={`app-shell${isMapHome ? " app-shell-map-home" : ""}`}>
      {!isOverlayRoute ? (
        <div className="app-shell-topbar">
          <Link className="app-brand" href="/">
            <span className="app-brand-mark" aria-hidden="true" />
            <span className="app-brand-copy">
              <strong>Near Me Cafe</strong>
              <span>Find great coffee anywhere</span>
            </span>
          </Link>
        </div>
      ) : null}

      <main className="app-shell-content">{children}</main>

      {!isOverlayRoute ? (
        <div className="app-shell-nav-wrap">
          <nav className="app-shell-nav" aria-label="Primary app navigation">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? normalizedPathname === "/"
                  : normalizedPathname === item.href || normalizedPathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  className={`app-nav-item${isActive ? " active" : ""}`}
                  href={item.href}
                  aria-label={item.label}
                >
                  {item.icon}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
