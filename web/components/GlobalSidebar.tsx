"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

interface GlobalSidebarProps {
  user: SidebarUser;
}

const navItems = [
  { href: "/", label: "Inbox", icon: "✉️" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/drive", label: "Drive", icon: "☁️" },
  { href: "/docs", label: "Docs", icon: "📝" },
  { href: "/sheets", label: "Sheets", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export default function GlobalSidebar({ user }: GlobalSidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const displayItems =
    user.role === "ADMIN"
      ? [...navItems, { href: "/admin", label: "Admin", icon: "🛡️" }]
      : navItems;

  return (
    <aside className="flex flex-col h-full w-64 bg-gray-950 border-r border-gray-800 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
          Q
        </div>
        <span className="text-lg font-semibold tracking-tight">
          Quant<span className="text-violet-400">mail</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {displayItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-3">
        <div className="flex items-center gap-3 px-3 py-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "avatar"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
              {getInitials(user.name, user.email)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.name ?? "User"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          {user.role === "ADMIN" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/50">
              Admin
            </span>
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-base">🚪</span>
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
