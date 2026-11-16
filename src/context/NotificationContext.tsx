import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeUserNotifications,
} from '../services/notificationService';
import { isFirebaseConfigured } from '../services/firebase';
import {
  listenForegroundPushMessages,
  registerUserPushToken,
} from '../services/messagingService';
import type { AppNotification } from '../types/domain';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isEmailVerified } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !isFirebaseConfigured || !isEmailVerified) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const items = await listNotifications(user.uid);
      setNotifications(items);
    } finally {
      setLoading(false);
    }
  }, [user, isEmailVerified]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !isEmailVerified) return;
    const channel = subscribeUserNotifications(user.uid, (incoming) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 60);
      });
    });

    registerUserPushToken(user.uid).catch(() => {});
    let unsubForeground = () => {};
    listenForegroundPushMessages(() => {
      refresh().catch(() => {});
    }).then((fn) => {
      unsubForeground = fn;
    });

    return () => {
      channel.unsubscribe();
      unsubForeground();
    };
  }, [user, isEmailVerified, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(user.uid);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider.');
  }
  return ctx;
}
