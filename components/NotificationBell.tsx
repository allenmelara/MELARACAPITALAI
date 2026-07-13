"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/notifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.notifications)) setNotifications(data.notifications);
      })
      .catch(() => {
        // Silent — the bell just stays empty; nothing else on the dashboard depends on it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  async function markAllRead() {
    setNotifications((current) => current?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
    await fetch("/api/notifications", { method: "PATCH" });
  }

  async function markOneRead(id: string) {
    setNotifications((current) => current?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? null);
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  return (
    <div className="notification-bell-wrap">
      <button className="notification-bell-toggle" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-bell-panel">
          <div className="notification-bell-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button className="notification-bell-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications === null && <p className="disclaimer">Loading...</p>}
          {notifications !== null && notifications.length === 0 && (
            <p className="disclaimer">Nothing yet — daily check-ins and recaps will show up here.</p>
          )}
          <ul className="notification-bell-list">
            {notifications?.map((n) => (
              <li
                key={n.id}
                className={`notification-bell-item ${n.readAt ? "" : "unread"}`}
                onClick={() => !n.readAt && markOneRead(n.id)}
              >
                <span className="notification-bell-item-title">{n.title}</span>
                <span className="notification-bell-item-body">{n.body}</span>
                <span className="notification-bell-item-time">{new Date(n.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
