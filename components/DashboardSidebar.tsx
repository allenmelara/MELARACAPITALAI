"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Home,
  PiggyBank,
  Wallet,
  FolderOpen,
  CreditCard,
  Settings,
  BarChart3,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import type { Plan } from "@/lib/profile";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/company", label: "Company Research", icon: Building2 },
  { href: "/dashboard/documents", label: "Document Analysis", icon: FileText },
  { href: "/dashboard/real-estate", label: "Real Estate", icon: Home },
  { href: "/dashboard/wealth", label: "Wealth Planner", icon: PiggyBank },
  { href: "/dashboard/portfolio", label: "Portfolio Tracker", icon: Wallet },
  { href: "/dashboard/reports", label: "Saved Reports", icon: FolderOpen },
  { href: "/pricing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

// Business-plan only — usage analytics needs no infrastructure beyond the
// existing usage_events log, but the page itself redirects non-Business
// plans, so only show the link once it's actually reachable.
const BUSINESS_NAV_ITEM = { href: "/dashboard/usage", label: "Usage Analytics", icon: BarChart3, exact: false };

const STORAGE_KEY = "melara:sidebar-collapsed";

export default function DashboardSidebar({ email, plan }: { email: string; plan: Plan }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside className={`dash-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="dash-sidebar-top">
        <Link href="/" className="brand">
          {collapsed ? "M" : (
            <>
              Melara Capital <span>AI</span>
            </>
          )}
        </Link>
        <button className="dash-sidebar-toggle" onClick={toggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <nav className="dash-nav">
        {(plan === "business"
          ? [...NAV_ITEMS.slice(0, 7), BUSINESS_NAV_ITEM, ...NAV_ITEMS.slice(7)]
          : NAV_ITEMS
        ).map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dash-nav-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="dash-sidebar-bottom">
        {plan === "free" && (
          <Link href="/pricing" className="primary dash-upgrade">
            {collapsed ? "↑" : "Upgrade to Pro"}
          </Link>
        )}
        {!collapsed && <span className="dash-sidebar-email">{email}</span>}
        <form action={signOutAction}>
          <button className="secondary dash-sidebar-signout" type="submit">
            {collapsed ? "⏻" : "Sign out"}
          </button>
        </form>
      </div>
    </aside>
  );
}
