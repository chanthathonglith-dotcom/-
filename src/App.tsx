import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Bell,
  ExternalLink,
  FilePlus2,
  Menu,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { AccessApprovalScreen } from './components/AccessApprovalScreen';
import { AdminApprovalsModal } from './components/AdminApprovalsModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ChannelEmblem } from './components/AppLogo';
import { DocumentAnalyticsView } from './components/DocumentAnalyticsView';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { DocumentFormModal } from './components/DocumentFormModal';
import { DocumentList } from './components/DocumentList';
import { LoginScreen } from './components/LoginScreen';
import { NotificationModal } from './components/NotificationModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QrScannerModal } from './components/QrScannerModal';
import { SearchFilterBar } from './components/SearchFilterBar';
import { NavSection, Sidebar } from './components/Sidebar';
import { ThemeToggleButton } from './components/ThemeToggleButton';
import { ToastViewport } from './components/ToastViewport';
import { WorkspaceSettingsModal } from './components/WorkspaceSettingsModal';
import { DEMO_DOCUMENTS } from './data/demoDocuments';
import {
  fetchSharedWorkspaceConfig,
  removeAccessRequest,
  reviewAccessRequest,
  saveSharedWorkspaceConfig,
  submitOrUpdateAccessRequest,
  subscribeAllAccessRequests,
  subscribeOwnAccessRequest,
} from './services/accessService';
import { testFirestoreConnection } from './services/firebaseClient';
import {
  loadLocalDriveConfig,
  saveLocalDriveConfig,
  saveScanFileToLocalDriveAndServer,
  syncDocumentsToLocalDriveAndServer,
  triggerExcelDownload,
} from './services/localDriveStorage';
import {
  BrowserPermissionState,
  getDesktopPushState,
  getNotificationPermissionState,
  loadNotificationSettings,
  loadNotifiedDueKeys,
  registerNotificationServiceWorker,
  requestBrowserNotificationPermission,
  saveNotificationSettings,
  saveNotifiedDueKeys,
  sendBrowserNotification,
  sendServerPushNotification,
  sendServerPushTest,
  subscribeDesktopPush,
  syncDocumentWatchesToServer,
  unsubscribeDesktopPush,
} from './services/browserNotifications';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  WorkspaceAuthError,
  appendDocumentToSheet,
  createNewSpreadsheet,
  deleteDocumentInSheet,
  deleteDriveFile,
  fetchDocumentsFromSheet,
  initializeWorkspace,
  updateDocumentInSheet,
  uploadScanFileToDrive,
} from './services/googleWorkspace';
import {
  AccessRequestRecord,
  AppNotificationItem,
  DEFAULT_FILTERS,
  DesktopPushState,
  DocumentDirection,
  DocumentFilters,
  DocumentInput,
  DocumentRecord,
  DocumentStatus,
  LocalDriveConfig,
  NotificationSettings,
  NotificationTriggerType,
  WorkspaceConnection,
  WorkspaceSharedConfig,
} from './types/document';
import {
  countPendingRequests,
  isSoleAdminEmail,
  resolveUserAccessGate,
} from './utils/accessControlLogic';
import {
  computeDocumentStats,
  exportDocumentsToCsv,
  filterDocuments,
  generateDocumentId,
  sortDocuments,
} from './utils/documentLogic';
import {
  buildDueDocumentNotification,
  buildNewDocumentNotification,
  detectDueDocuments,
  getDueDedupeKey,
  getLocalTodayIso,
} from './utils/notificationLogic';
import {
  buildDocumentWatchItems,
  extractDocIdFromUrl,
} from './utils/pushNotificationLogic';
import { realtimeClient } from './services/realtimeClient';
import { applyRealtimeDelta } from './utils/realtimeSyncLogic';
import {
  applyThemeToDocument,
  loadSavedTheme,
  saveThemePreference,
} from './services/themeStorage';
import { ThemeMode, toggleThemeMode } from './utils/themeLogic';
import {
  CreateToastInput,
  ToastItem,
  createToastItem,
  dismissToast,
  upsertToast,
} from './utils/toastLogic';

type PendingMutation =
  | { type: 'edit'; record: DocumentRecord; input: DocumentInput }
  | { type: 'delete'; record: DocumentRecord }
  | null;

function shouldAutoStartDemo(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1' || params.get('demo') === '1';
}

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => shouldAutoStartDemo());
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !shouldAutoStartDemo());
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [connection, setConnection] = useState<WorkspaceConnection | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    shouldAutoStartDemo() ? DEMO_DOCUMENTS : []
  );
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [activeSection, setActiveSection] = useState<NavSection>('all');
  const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_FILTERS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<DocumentRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<DocumentRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [adminApprovalsOpen, setAdminApprovalsOpen] = useState(false);

  const [localDriveConfig, setLocalDriveConfig] = useState<LocalDriveConfig>(() =>
    loadLocalDriveConfig()
  );

  const [ownAccessRequest, setOwnAccessRequest] = useState<AccessRequestRecord | null>(null);
  const [accessChecking, setAccessChecking] = useState(false);
  const [isSubmittingAccessRequest, setIsSubmittingAccessRequest] = useState(false);
  const [adminRequests, setAdminRequests] = useState<AccessRequestRecord[]>([]);
  const [sharedWorkspaceConfig, setSharedWorkspaceConfig] =
    useState<WorkspaceSharedConfig | null>(null);
  const workspaceLoadedForUidRef = useRef<string | null>(null);

  const [pendingMutation, setPendingMutation] = useState<PendingMutation>(null);
  const [isMutating, setIsMutating] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => loadSavedTheme());
  const [permissionState, setPermissionState] = useState<BrowserPermissionState>(() =>
    getNotificationPermissionState()
  );
  const [desktopPushState, setDesktopPushState] = useState<DesktopPushState>({
    support: 'supported',
    subscribed: false,
    subscriptionEndpoint: null,
    serverReady: false,
    activeServerSubscribers: 0,
    lastError: null,
  });
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pendingDeepLinkDocId, setPendingDeepLinkDocId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? extractDocIdFromUrl(window.location.search) : null
  );
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    loadNotificationSettings()
  );
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);

  const toastTimersRef = useRef<Map<string, number>>(new Map());

  const handleDismissToast = useCallback((id: string) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => dismissToast(prev, id));
  }, []);

  const showToast = useCallback(
    (input: CreateToastInput): string => {
      const item = createToastItem(input);
      const existingTimer = toastTimersRef.current.get(item.id);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        toastTimersRef.current.delete(item.id);
      }

      setToasts((prev) => upsertToast(prev, item));

      if (item.durationMs > 0 && typeof window !== 'undefined') {
        const timer = window.setTimeout(() => {
          toastTimersRef.current.delete(item.id);
          setToasts((prev) => dismissToast(prev, item.id));
        }, item.durationMs);
        toastTimersRef.current.set(item.id, timer);
      }
      return item.id;
    },
    []
  );

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = toggleThemeMode(prev);
      saveThemePreference(next);
      return next;
    });
  }, []);

  const documentsRef = useRef<DocumentRecord[]>(documents);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const dispatchNotification = useCallback(
    async (payload: {
      type: NotificationTriggerType;
      title: string;
      body: string;
      tag: string;
      docId?: string;
    }) => {
      const item: AppNotificationItem = {
        id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        docId: payload.docId,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, 50));
      if (payload.type !== NotificationTriggerType.TEST) {
        showToast({
          variant: 'info',
          title: payload.title,
          description: payload.body,
        });
      }

      if (
        payload.type !== NotificationTriggerType.TEST &&
        notificationSettings.backgroundPushEnabled &&
        desktopPushState.subscribed
      ) {
        const result = await sendServerPushNotification(
          {
            title: payload.title,
            body: payload.body,
            tag: payload.tag,
            docId: payload.docId,
          },
          notificationSettings
        );
        if (result.delivered > 0) {
          return;
        }
      }

      await sendBrowserNotification(
        {
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          docId: payload.docId,
        },
        notificationSettings
      );
    },
    [desktopPushState.subscribed, notificationSettings, showToast]
  );

  const runDueDateCheck = useCallback(
    async (targetDocs: DocumentRecord[], forceIncludeToday = false) => {
      if (!notificationSettings.enabled || !notificationSettings.notifyOnDueDate) {
        return 0;
      }
      const todayIso = getLocalTodayIso();
      const notifiedKeys = forceIncludeToday
        ? new Set<string>()
        : loadNotifiedDueKeys(todayIso);
      const dueDocs = detectDueDocuments(targetDocs, todayIso, notifiedKeys);
      if (dueDocs.length === 0) return 0;

      for (const doc of dueDocs) {
        const payload = buildDueDocumentNotification(doc, todayIso);
        await dispatchNotification(payload);
        notifiedKeys.add(getDueDedupeKey(doc.id, todayIso));
      }
      saveNotifiedDueKeys(todayIso, notifiedKeys);
      return dueDocs.length;
    },
    [dispatchNotification, notificationSettings.enabled, notificationSettings.notifyOnDueDate]
  );

  const loadWorkspaceData = useCallback(
    async (token: string, uid: string, preferredSheetId?: string) => {
      setIsLoadingDocs(true);
      setBannerError(null);
      const toastId = showToast({
        id: 'workspace-load',
        variant: 'loading',
        title: 'ກຳລັງໂຫຼດຂໍ້ມູນ...',
        description: 'ກຳລັງດຶງຂໍ້ມູນຈາກ Google Sheets',
      });
      try {
        const conn = await initializeWorkspace(token, uid, preferredSheetId);
        setConnection(conn);
        const rows = await fetchDocumentsFromSheet(token, conn);
        setDocuments(rows);
        showToast({
          id: toastId,
          variant: 'success',
          title: 'ໂຫຼດຂໍ້ມູນສຳເລັດ',
          description: `ເຊື່ອມຕໍ່ ${rows.length} ລາຍການຈາກ Google Sheets`,
        });
      } catch (err) {
        if (err instanceof WorkspaceAuthError) {
          clearAccessToken();
          setNeedsAuth(true);
          setAuthError(err.message);
          showToast({
            id: toastId,
            variant: 'error',
            title: 'ເກີດຂໍ້ຜິດພາດ',
            description: err.message,
          });
        } else {
          const msg =
            err instanceof Error
              ? err.message
              : 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນຈາກ Google Sheets ໄດ້';
          setBannerError(msg);
          showToast({
            id: toastId,
            variant: 'error',
            title: 'ເກີດຂໍ້ຜິດພາດ',
            description: msg,
          });
        }
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void testFirestoreConnection();
    void (async () => {
      await registerNotificationServiceWorker();
      setPermissionState(getNotificationPermissionState());
      const pushState = await getDesktopPushState();
      setDesktopPushState(pushState);
    })();
  }, []);

  // Listen to Service Worker postMessage events (clicking Lock Screen notification or receiving background push)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; docId?: string; title?: string; body?: string }
        | undefined;
      if (!data) return;
      if (data.type === 'OPEN_DOCUMENT' && data.docId) {
        const matched = documentsRef.current.find((d) => d.id === data.docId);
        if (matched) {
          setViewingRecord(matched);
        } else {
          setPendingDeepLinkDocId(data.docId);
        }
      } else if (data.type === 'PUSH_RECEIVED' && data.title && data.body) {
        setNotifications((prev) => [
          {
            id: `NTF-SW-${Date.now()}`,
            type: NotificationTriggerType.NEW_SHEET_DOCUMENT,
            title: data.title!,
            body: data.body!,
            docId: data.docId,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ].slice(0, 50));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // Resolve deep-linked document ID from Lock Screen notification click (?docId=...)
  useEffect(() => {
    if (!pendingDeepLinkDocId || needsAuth || documents.length === 0) return;
    const found = documents.find((d) => d.id === pendingDeepLinkDocId);
    if (found) {
      setViewingRecord(found);
      setPendingDeepLinkDocId(null);
    }
  }, [documents, needsAuth, pendingDeepLinkDocId]);

  // Sync due-date watches to backend push scheduler when subscribed
  useEffect(() => {
    if (
      needsAuth ||
      !notificationSettings.enabled ||
      !notificationSettings.backgroundPushEnabled ||
      !desktopPushState.subscribed
    ) {
      return;
    }
    const watches = buildDocumentWatchItems(documents);
    void syncDocumentWatchesToServer(watches);
  }, [
    desktopPushState.subscribed,
    documents,
    needsAuth,
    notificationSettings.backgroundPushEnabled,
    notificationSettings.enabled,
  ]);

  const isSoleAdmin = useMemo(
    () => Boolean(!isDemoMode && user && isSoleAdminEmail(user.email, user.emailVerified)),
    [isDemoMode, user]
  );

  const userAccessGate = useMemo(() => {
    if (!user) return 'unverified' as const;
    return resolveUserAccessGate({
      email: user.email,
      emailVerified: user.emailVerified,
      request: ownAccessRequest,
    });
  }, [user, ownAccessRequest]);

  const isAccessGranted = isDemoMode || isSoleAdmin || userAccessGate === 'approved';
  const pendingApprovalsCount = useMemo(
    () => countPendingRequests(adminRequests),
    [adminRequests]
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setIsDemoMode(false);
        setNeedsAuth(false);
      },
      (signedInUserWithoutToken) => {
        setUser(signedInUserWithoutToken);
        workspaceLoadedForUidRef.current = null;
        if (!shouldAutoStartDemo()) {
          setNeedsAuth(true);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // Firestore real-time access listener & workspace bootstrap once approved
  useEffect(() => {
    if (isDemoMode || needsAuth || !user) {
      setOwnAccessRequest(null);
      setAdminRequests([]);
      setAccessChecking(false);
      return;
    }

    if (isSoleAdmin) {
      setAccessChecking(false);
      const unsubAll = subscribeAllAccessRequests(
        (items) => setAdminRequests(items),
        () => {}
      );
      void fetchSharedWorkspaceConfig()
        .then((cfg) => setSharedWorkspaceConfig(cfg))
        .catch(() => {});

      const token = getAccessToken();
      if (token && workspaceLoadedForUidRef.current !== user.uid) {
        workspaceLoadedForUidRef.current = user.uid;
        void loadWorkspaceData(token, user.uid);
      }
      return () => unsubAll();
    }

    setAccessChecking(true);
    const unsubOwn = subscribeOwnAccessRequest(
      user.uid,
      (req) => {
        setOwnAccessRequest(req);
        setAccessChecking(false);
      },
      () => {
        setAccessChecking(false);
      }
    );
    return () => unsubOwn();
  }, [isDemoMode, isSoleAdmin, loadWorkspaceData, needsAuth, user]);

  // Auto-load workspace as soon as a non-admin account gets approved
  useEffect(() => {
    if (isDemoMode || needsAuth || !user || isSoleAdmin) return;
    if (userAccessGate !== 'approved') {
      workspaceLoadedForUidRef.current = null;
      return;
    }
    if (workspaceLoadedForUidRef.current === user.uid) return;

    const token = getAccessToken();
    if (!token) return;
    workspaceLoadedForUidRef.current = user.uid;

    void (async () => {
      let preferredSheetId: string | undefined;
      try {
        const sharedCfg = await fetchSharedWorkspaceConfig();
        setSharedWorkspaceConfig(sharedCfg);
        if (sharedCfg?.spreadsheetId) {
          preferredSheetId = sharedCfg.spreadsheetId;
        }
      } catch {
        // ignore if shared config has not been published yet
      }
      await loadWorkspaceData(token, user.uid, preferredSheetId);
    })();
  }, [isDemoMode, isSoleAdmin, loadWorkspaceData, needsAuth, user, userAccessGate]);

  // Check due documents whenever document list updates or every 60s
  useEffect(() => {
    if (needsAuth || documents.length === 0) return;
    void runDueDateCheck(documents);
    const interval = window.setInterval(() => {
      void runDueDateCheck(documentsRef.current);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [documents, needsAuth, runDueDateCheck]);

  const activeRoomId = isDemoMode ? 'demo' : connection?.spreadsheetId || null;

  // Join WebSocket room for real-time Live Updates (demo room or connected Google Spreadsheet)
  useEffect(() => {
    if (needsAuth || !activeRoomId) {
      realtimeClient.leaveCurrentRoom();
      return;
    }

    const seedDocs = isDemoMode ? DEMO_DOCUMENTS : documentsRef.current;
    realtimeClient.joinRoom(activeRoomId, seedDocs);

    if (!isDemoMode && connection) {
      const token = getAccessToken();
      if (token) {
        realtimeClient.watchGoogleSheet(
          activeRoomId,
          connection.spreadsheetId,
          connection.sheetTitle,
          token
        );
      }
    } else {
      realtimeClient.unwatchGoogleSheet(activeRoomId);
    }
  }, [activeRoomId, connection, isDemoMode, needsAuth]);

  // Listen to live WebSocket events (created, updated, deleted, Google Sheets deltas)
  useEffect(() => {
    const clientId = realtimeClient.getClientId();

    const unsubEvents = realtimeClient.onEvent((event) => {
      if (event.senderId && event.senderId === clientId) {
        return;
      }

      if (event.type === 'documents:snapshot') {
        setDocuments((prev) => applyRealtimeDelta(prev, event));
        return;
      }

      if (event.type === 'document:created') {
        const alreadyExists = documentsRef.current.some((d) => d.id === event.document.id);
        setDocuments((prev) => applyRealtimeDelta(prev, event));
        if (!alreadyExists) {
          if (notificationSettings.enabled && notificationSettings.notifyOnNewSheetRows) {
            void dispatchNotification(buildNewDocumentNotification(event.document));
          } else {
            showToast({
              variant: 'info',
              title: 'ເພີ່ມເອກະສານໃໝ່ (Live Update)',
              description: `${event.document.docNumber} — ${event.document.title}`,
            });
          }
        }
        return;
      }

      if (event.type === 'document:updated') {
        setDocuments((prev) => applyRealtimeDelta(prev, event));
        setViewingRecord((prev) =>
          prev && prev.id === event.document.id ? event.document : prev
        );
        showToast({
          variant: 'info',
          title: 'ອັບເດດຂໍ້ມູນອັດຕະໂນມັດ (Live Update)',
          description: `${event.document.docNumber} — ${event.document.title}`,
        });
        return;
      }

      if (event.type === 'document:deleted') {
        const target = documentsRef.current.find((d) => d.id === event.docId);
        setDocuments((prev) => applyRealtimeDelta(prev, event));
        setViewingRecord((prev) => (prev && prev.id === event.docId ? null : prev));
        if (target) {
          showToast({
            variant: 'info',
            title: 'ລຶບເອກະສານອອກແລ້ວ (Live Update)',
            description: `${target.docNumber} — ${target.title}`,
          });
        }
        return;
      }

      if (event.type === 'sheets:delta') {
        setDocuments((prev) => applyRealtimeDelta(prev, event));

        const updatedMap = new Map(event.updated.map((d) => [d.id, d]));
        const deletedSet = new Set(event.deletedIds);
        setViewingRecord((prev) => {
          if (!prev) return null;
          if (deletedSet.has(prev.id)) return null;
          return updatedMap.get(prev.id) ?? prev;
        });

        for (const addedDoc of event.added) {
          if (notificationSettings.enabled && notificationSettings.notifyOnNewSheetRows) {
            void dispatchNotification(buildNewDocumentNotification(addedDoc));
          }
        }

        if (
          event.added.length > 0 &&
          !(notificationSettings.enabled && notificationSettings.notifyOnNewSheetRows)
        ) {
          showToast({
            variant: 'info',
            title: 'ມີເອກະສານໃໝ່ໃນ Google Sheets',
            description: `ອັບເດດເພີ່ມເຕີມ ${event.added.length} ລາຍການອັດຕະໂນມັດ`,
          });
        }

        if (event.updated.length > 0 || event.deletedIds.length > 0) {
          const summaryParts: string[] = [];
          if (event.updated.length > 0) summaryParts.push(`ແກ້ໄຂ ${event.updated.length} ລາຍການ`);
          if (event.deletedIds.length > 0) summaryParts.push(`ລຶບ ${event.deletedIds.length} ລາຍການ`);
          showToast({
            variant: 'info',
            title: 'ອັບເດດຈາກ Google Sheets (Live Update)',
            description: summaryParts.join(' · '),
          });
        }
      }
    });

    const unsubAuthExpired = realtimeClient.onSheetsAuthExpired(() => {
      clearAccessToken();
      setNeedsAuth(true);
      setAuthError('Session ໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບ Google ໃໝ່ອີກຄັ້ງ');
    });

    return () => {
      unsubEvents();
      unsubAuthExpired();
    };
  }, [
    dispatchNotification,
    notificationSettings.enabled,
    notificationSettings.notifyOnNewSheetRows,
    showToast,
  ]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    setBannerError(null);
    try {
      const result = await googleSignIn();
      workspaceLoadedForUidRef.current = null;
      setUser(result.user);
      setIsDemoMode(false);
      setNeedsAuth(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'ການເຂົ້າສູ່ລະບົບດ້ວຍ Google ບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່';
      setAuthError(msg);
      showToast({
        variant: 'error',
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: msg,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    setNeedsAuth(false);
    setAuthError(null);
    setBannerError(null);
    setDocuments(DEMO_DOCUMENTS);
  };

  const handleLogout = async () => {
    await logout();
    workspaceLoadedForUidRef.current = null;
    setOwnAccessRequest(null);
    setAdminRequests([]);
    setConnection(null);
    setDocuments([]);
    setIsDemoMode(false);
    setNeedsAuth(true);
  };

  const handleSelectSection = (section: NavSection) => {
    setActiveSection(section);
    if (section === 'all') {
      setFilters((prev) => ({ ...prev, direction: 'all', status: 'all' }));
    } else if (section === 'incoming') {
      setFilters((prev) => ({
        ...prev,
        direction: DocumentDirection.INCOMING,
        status: 'all',
      }));
    } else if (section === 'outgoing') {
      setFilters((prev) => ({
        ...prev,
        direction: DocumentDirection.OUTGOING,
        status: 'all',
      }));
    } else if (section === 'legal') {
      setFilters((prev) => ({
        ...prev,
        direction: DocumentDirection.LEGAL,
        status: 'all',
      }));
    } else if (section === 'speech') {
      setFilters((prev) => ({
        ...prev,
        direction: DocumentDirection.SPEECH,
        status: 'all',
      }));
    } else if (section === 'pending') {
      setFilters((prev) => ({
        ...prev,
        direction: 'all',
        status: DocumentStatus.PENDING,
      }));
    }
  };

  const handleFiltersChange = (nextFilters: DocumentFilters) => {
    setFilters(nextFilters);
    if (nextFilters.direction === DocumentDirection.INCOMING) {
      setActiveSection('incoming');
    } else if (nextFilters.direction === DocumentDirection.OUTGOING) {
      setActiveSection('outgoing');
    } else if (nextFilters.direction === DocumentDirection.LEGAL) {
      setActiveSection('legal');
    } else if (nextFilters.direction === DocumentDirection.SPEECH) {
      setActiveSection('speech');
    } else if (nextFilters.status === DocumentStatus.PENDING) {
      setActiveSection('pending');
    } else {
      setActiveSection('all');
    }
  };

  const handleFilterByMonth = (monthKey: string) => {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0');
    setFilters({
      ...DEFAULT_FILTERS,
      dateFrom: `${monthKey}-01`,
      dateTo: `${monthKey}-${lastDay}`,
    });
    setActiveSection('all');
  };

  const stats = useMemo(() => computeDocumentStats(documents), [documents]);

  const filteredDocuments = useMemo(() => {
    const filtered = filterDocuments(documents, filters);
    return sortDocuments(filtered, filters.sortOrder);
  }, [documents, filters]);

  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    filters.direction !== 'all' ||
    filters.purpose !== 'all' ||
    filters.status !== 'all' ||
    Boolean(filters.department.trim()) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  const syncLocalDriveIfEnabled = useCallback(
    async (nextDocs: DocumentRecord[]) => {
      if (localDriveConfig.mode === 'google') return;
      const syncResult = await syncDocumentsToLocalDriveAndServer(
        nextDocs,
        localDriveConfig
      );
      const nextCfg: LocalDriveConfig = {
        ...localDriveConfig,
        lastLocalSyncAt: syncResult.syncedAt,
      };
      setLocalDriveConfig(nextCfg);
      saveLocalDriveConfig(nextCfg);
    },
    [localDriveConfig]
  );

  const handleUploadFileToDrive = async (file: File) => {
    if (localDriveConfig.mode === 'local_drive') {
      const saved = await saveScanFileToLocalDriveAndServer(file);
      return {
        id: saved.id,
        name: saved.name,
        webViewLink: saved.webViewLink,
      };
    }

    if (localDriveConfig.mode === 'both') {
      const localSaved = await saveScanFileToLocalDriveAndServer(file);
      const token = getAccessToken();
      if (token && connection && !isDemoMode) {
        const driveUploaded = await uploadScanFileToDrive(
          token,
          connection.driveFolderId,
          file
        );
        return driveUploaded;
      }
      return {
        id: localSaved.id,
        name: localSaved.name,
        webViewLink: localSaved.webViewLink,
      };
    }

    const token = getAccessToken();
    if (!token || !connection) {
      throw new Error('ກະລຸນາເຂົ້າສູ່ລະບົບ Google ກ່ອນອັບໂຫຼດຟາຍ');
    }
    return uploadScanFileToDrive(token, connection.driveFolderId, file);
  };

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setEditingRecord(null);
    setFormOpen(true);
  };

  const handleOpenEditModal = (record: DocumentRecord) => {
    setFormMode('edit');
    setEditingRecord(record);
    setFormOpen(true);
  };

  const handleFormSubmit = async (input: DocumentInput) => {
    if (formMode === 'edit' && editingRecord) {
      // Mandatory user confirmation before updating existing document record
      setFormOpen(false);
      setPendingMutation({ type: 'edit', record: editingRecord, input });
      return;
    }

    const newRecord: DocumentRecord = {
      ...input,
      id: generateDocumentId(),
      createdBy: isDemoMode ? 'demo@example.com' : user?.email || '',
      updatedAt: new Date().toISOString(),
    };

    if (isDemoMode || localDriveConfig.mode === 'local_drive') {
      const nextDocs = [newRecord, ...documentsRef.current];
      setDocuments(nextDocs);
      realtimeClient.emitCreated(activeRoomId || 'demo', newRecord);
      await syncLocalDriveIfEnabled(nextDocs);
      setFormOpen(false);
      showToast({
        variant: 'success',
        title: 'ບັນທຶກສຳເລັດ',
        description:
          localDriveConfig.mode === 'local_drive'
            ? `ບັນທຶກ "${newRecord.docNumber}" ລົງ Excel / Drive D: ແລ້ວ`
            : `ບັນທຶກເອກະສານ "${newRecord.docNumber}" ສຳເລັດແລ້ວ`,
      });
      return;
    }

    const token = getAccessToken();
    if (!token || !connection) {
      setNeedsAuth(true);
      return;
    }

    setIsMutating(true);
    setBannerError(null);
    const toastId = showToast({
      id: 'doc-create',
      variant: 'loading',
      title: 'ກຳລັງບັນທຶກ...',
      description: `ກຳລັງບັນທຶກເອກະສານ "${newRecord.docNumber}" ລົງ Google Sheets`,
    });
    try {
      await appendDocumentToSheet(token, connection, newRecord);
      const updatedRows = await fetchDocumentsFromSheet(token, connection);
      setDocuments(updatedRows);
      await syncLocalDriveIfEnabled(updatedRows);
      const syncedRecord = updatedRows.find((r) => r.id === newRecord.id) ?? newRecord;
      realtimeClient.emitCreated(connection.spreadsheetId, syncedRecord);
      setFormOpen(false);
      showToast({
        id: toastId,
        variant: 'success',
        title: 'ບັນທຶກສຳເລັດ',
        description: `ບັນທຶກເອກະສານ "${newRecord.docNumber}" ລົງ Google Sheets ແລ້ວ`,
      });
    } catch (err) {
      if (err instanceof WorkspaceAuthError) {
        clearAccessToken();
        setNeedsAuth(true);
        setAuthError(err.message);
        showToast({
          id: toastId,
          variant: 'error',
          title: 'ເກີດຂໍ້ຜິດພາດ',
          description: err.message,
        });
      } else {
        const msg = err instanceof Error ? err.message : 'ບັນທຶກເອກະສານບໍ່ສຳເລັດ';
        setBannerError(msg);
        showToast({
          id: toastId,
          variant: 'error',
          title: 'ເກີດຂໍ້ຜິດພາດ',
          description: msg,
        });
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleRequestDelete = (record: DocumentRecord) => {
    setPendingMutation({ type: 'delete', record });
  };

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;

    if (pendingMutation.type === 'edit') {
      const updated: DocumentRecord = {
        ...pendingMutation.record,
        ...pendingMutation.input,
        updatedAt: new Date().toISOString(),
      };

      if (isDemoMode || localDriveConfig.mode === 'local_drive') {
        const nextDocs = documentsRef.current.map((item) =>
          item.id === updated.id ? updated : item
        );
        setDocuments(nextDocs);
        realtimeClient.emitUpdated(activeRoomId || 'demo', updated);
        await syncLocalDriveIfEnabled(nextDocs);
        setPendingMutation(null);
        showToast({
          variant: 'success',
          title: 'ບັນທຶກສຳເລັດ',
          description: `ອັບເດດເອກະສານ "${updated.docNumber}" ສຳເລັດແລ້ວ`,
        });
        return;
      }

      const token = getAccessToken();
      if (!token || !connection) {
        setPendingMutation(null);
        setNeedsAuth(true);
        return;
      }

      setIsMutating(true);
      setBannerError(null);
      const toastId = showToast({
        id: 'doc-edit',
        variant: 'loading',
        title: 'ກຳລັງບັນທຶກການແກ້ໄຂ...',
        description: `ກຳລັງອັບເດດເອກະສານ "${updated.docNumber}"`,
      });
      try {
        await updateDocumentInSheet(token, connection, updated);
        const refreshed = await fetchDocumentsFromSheet(token, connection);
        setDocuments(refreshed);
        await syncLocalDriveIfEnabled(refreshed);
        const syncedUpdated = refreshed.find((r) => r.id === updated.id) ?? updated;
        realtimeClient.emitUpdated(connection.spreadsheetId, syncedUpdated);
        setPendingMutation(null);
        showToast({
          id: toastId,
          variant: 'success',
          title: 'ບັນທຶກສຳເລັດ',
          description: `ອັບເດດເອກະສານ "${updated.docNumber}" ໃນ Google Sheets ແລ້ວ`,
        });
      } catch (err) {
        if (err instanceof WorkspaceAuthError) {
          clearAccessToken();
          setNeedsAuth(true);
          setAuthError(err.message);
          showToast({
            id: toastId,
            variant: 'error',
            title: 'ເກີດຂໍ້ຜິດພາດ',
            description: err.message,
          });
        } else {
          const msg = err instanceof Error ? err.message : 'ອັບເດດຂໍ້ມູນບໍ່ສຳເລັດ';
          setBannerError(msg);
          showToast({
            id: toastId,
            variant: 'error',
            title: 'ເກີດຂໍ້ຜິດພາດ',
            description: msg,
          });
        }
      } finally {
        setIsMutating(false);
      }
      return;
    }

    if (pendingMutation.type === 'delete') {
      const target = pendingMutation.record;

      if (isDemoMode || localDriveConfig.mode === 'local_drive') {
        const nextDocs = documentsRef.current.filter((item) => item.id !== target.id);
        setDocuments(nextDocs);
        realtimeClient.emitDeleted(activeRoomId || 'demo', target.id);
        await syncLocalDriveIfEnabled(nextDocs);
        setPendingMutation(null);
        showToast({
          variant: 'success',
          title: 'ລຶບເອກະສານສຳເລັດ',
          description: `ລຶບເອກະສານ "${target.docNumber}" ອອກຈາກລາຍການແລ້ວ`,
        });
        return;
      }

      const token = getAccessToken();
      if (!token || !connection) {
        setPendingMutation(null);
        setNeedsAuth(true);
        return;
      }

      setIsMutating(true);
      setBannerError(null);
      const toastId = showToast({
        id: 'doc-delete',
        variant: 'loading',
        title: 'ກຳລັງລຶບເອກະສານ...',
        description: target.docNumber,
      });
      try {
        await deleteDocumentInSheet(token, connection, target.id);
        if (target.driveFileId) {
          try {
            await deleteDriveFile(token, target.driveFileId);
          } catch {
            // Keep sheet deletion resilient if file was already removed from Drive
          }
        }
        const refreshed = await fetchDocumentsFromSheet(token, connection);
        setDocuments(refreshed);
        await syncLocalDriveIfEnabled(refreshed);
        realtimeClient.emitDeleted(connection.spreadsheetId, target.id);
        setPendingMutation(null);
        showToast({
          id: toastId,
          variant: 'success',
          title: 'ລຶບເອກະສານສຳເລັດ',
          description: `ລຶບເອກະສານ "${target.docNumber}" ອອກຈາກ Google Sheets ແລ້ວ`,
        });
      } catch (err) {
        if (err instanceof WorkspaceAuthError) {
          clearAccessToken();
          setNeedsAuth(true);
          setAuthError(err.message);
          showToast({
            id: toastId,
            variant: 'error',
            title: 'ເກີດຂໍ້ຜິດພາດ',
            description: err.message,
          });
        } else {
          const msg = err instanceof Error ? err.message : 'ລຶບເອກະສານບໍ່ສຳເລັດ';
          setBannerError(msg);
          showToast({
            id: toastId,
            variant: 'error',
            title: 'ເກີດຂໍ້ຜິດພາດ',
            description: msg,
          });
        }
      } finally {
        setIsMutating(false);
      }
    }
  };

  const handleRefreshSync = async () => {
    if (isDemoMode) {
      showToast({
        variant: 'info',
        title: 'ຂໍ້ມູນຢູ່ໃນສະພາບລ່າສຸດແລ້ວ',
        description: 'ກຳລັງໃຊ້ງານຂໍ້ມູນຕົວຢ່າງໃນເຄື່ອງ',
      });
      return;
    }
    const token = getAccessToken();
    if (!token || !connection) {
      setNeedsAuth(true);
      return;
    }
    setIsSyncing(true);
    setBannerError(null);
    const toastId = showToast({
      id: 'sheet-sync',
      variant: 'loading',
      title: 'ກຳລັງຊິ້ງຂໍ້ມູນ...',
      description: 'ກຳລັງດຶງຂໍ້ມູນລ່າສຸດຈາກ Google Sheets',
    });
    try {
      const rows = await fetchDocumentsFromSheet(token, connection);
      setDocuments(rows);
      showToast({
        id: toastId,
        variant: 'success',
        title: 'ຊິ້ງຂໍ້ມູນສຳເລັດ',
        description: `ອັບເດດ ${rows.length} ລາຍການຈາກ Google Sheets ແລ້ວ`,
      });
    } catch (err) {
      if (err instanceof WorkspaceAuthError) {
        clearAccessToken();
        setNeedsAuth(true);
        setAuthError(err.message);
        showToast({
          id: toastId,
          variant: 'error',
          title: 'ເກີດຂໍ້ຜິດພາດ',
          description: err.message,
        });
      } else {
        const msg = err instanceof Error ? err.message : 'ຊິ້ງຂໍ້ມູນບໍ່ສຳເລັດ';
        setBannerError(msg);
        showToast({
          id: toastId,
          variant: 'error',
          title: 'ເກີດຂໍ້ຜິດພາດ',
          description: msg,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLinkSpreadsheetId = async (spreadsheetId: string) => {
    const token = getAccessToken();
    if (!token || !user) {
      setNeedsAuth(true);
      return;
    }
    setIsSyncing(true);
    try {
      await loadWorkspaceData(token, user.uid, spreadsheetId);
      showToast({
        variant: 'success',
        title: 'ເຊື່ອມຕໍ່ສຳເລັດ',
        description: 'ເຊື່ອມຕໍ່ Google Sheets ໃໝ່ສຳເລັດແລ້ວ',
      });
      setSettingsOpen(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    const token = getAccessToken();
    if (!token || !user) {
      setNeedsAuth(true);
      return;
    }
    setIsSyncing(true);
    const toastId = showToast({
      id: 'sheet-create',
      variant: 'loading',
      title: 'ກຳລັງສ້າງ Google Sheets...',
    });
    try {
      const created = await createNewSpreadsheet(token);
      await loadWorkspaceData(token, user.uid, created.spreadsheetId);
      showToast({
        id: toastId,
        variant: 'success',
        title: 'ສ້າງ ແລະ ເຊື່ອມຕໍ່ສຳເລັດ',
        description: 'ສ້າງ Google Sheets ໃໝ່ສຳເລັດແລ້ວ',
      });
      setSettingsOpen(false);
    } catch (err) {
      showToast({
        id: toastId,
        variant: 'error',
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: err instanceof Error ? err.message : 'ບໍ່ສາມາດສ້າງ Google Sheets ໃໝ່ໄດ້',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCsv = () => {
    const csv = exportDocumentsToCsv(filteredDocuments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `documents-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    showToast({
      variant: 'success',
      title: 'ສົ່ງອອກຟາຍ CSV ສຳເລັດ',
      description: `ສົ່ງອອກ ${filteredDocuments.length} ລາຍການ`,
    });
  };

  const handleExportExcel = () => {
    const filename = triggerExcelDownload(filteredDocuments, 'documents');
    showToast({
      variant: 'success',
      title: 'ສົ່ງອອກ Excel (.xlsx) ສຳເລັດ',
      description: `${filename} · ${filteredDocuments.length} ລາຍການ`,
    });
  };

  const handleSyncLocalExcel = async () => {
    setIsSyncing(true);
    try {
      const result = await syncDocumentsToLocalDriveAndServer(
        documents,
        localDriveConfig
      );
      const nextCfg: LocalDriveConfig = {
        ...localDriveConfig,
        lastLocalSyncAt: result.syncedAt,
      };
      setLocalDriveConfig(nextCfg);
      saveLocalDriveConfig(nextCfg);
      showToast({
        variant: 'success',
        title: 'ຊິ້ງຂໍ້ມູນລົງ Excel (.xlsx) ສຳເລັດ',
        description: result.wroteDirectoryHandle
          ? `ຂຽນລົງໂຟນເດີ ${localDriveConfig.linkedFolderName || 'Drive D:'} ແລະ Server ແລ້ວ`
          : `ບັນທຶກ ${documents.length} ລາຍການລົງ Excel backup ແລ້ວ`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportExcelDocuments = async (importedDocs: DocumentRecord[]) => {
    setDocuments(importedDocs);
    await syncDocumentsToLocalDriveAndServer(importedDocs, localDriveConfig);
    showToast({
      variant: 'success',
      title: 'ນຳເຂົ້າຂໍ້ມູນຈາກ Excel ສຳເລັດ',
      description: `ໂຫຼດ ${importedDocs.length} ລາຍການຈາກຟາຍ .xlsx`,
    });
  };

  if (needsAuth && !isDemoMode) {
    return (
      <>
        <LoginScreen
          onGoogleLogin={handleGoogleLogin}
          onEnterDemo={handleEnterDemo}
          isLoggingIn={isLoggingIn}
          errorMessage={authError}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <ToastViewport toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  if (!isDemoMode && user && !isAccessGranted) {
    if (accessChecking) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-sm text-slate-600 dark:text-slate-300">
          ກຳລັງກວດສອບສິດການເຂົ້າໃຊ້ງານກັບ Admin ({user.email})...
        </div>
      );
    }

    return (
      <>
        <AccessApprovalScreen
          userEmail={user.email || ''}
          userDisplayName={user.displayName || ''}
          userPhotoUrl={user.photoURL || ''}
          gateState={userAccessGate as 'needs_request' | 'pending' | 'rejected' | 'unverified'}
          existingRequest={ownAccessRequest}
          isSubmitting={isSubmittingAccessRequest}
          onSubmitRequest={async (reason) => {
            setIsSubmittingAccessRequest(true);
            try {
              await submitOrUpdateAccessRequest({
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName,
                photoURL: user.photoURL,
                reason,
              });
              showToast({
                variant: 'success',
                title: 'ສົ່ງຄຳຂໍອະນຸມັດສຳເລັດ',
                description: 'ກະລຸນາລໍຖ້າ Admin (chanthathonglith@gmail.com) ອະນຸມັດ',
              });
            } finally {
              setIsSubmittingAccessRequest(false);
            }
          }}
          onLogout={handleLogout}
          onEnterDemo={handleEnterDemo}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <ToastViewport toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  const sectionTitles: Record<NavSection, string> = {
    all: 'ເອກະສານທັງໝົດ',
    incoming: 'ເອກະສານຂາເຂົ້າ',
    outgoing: 'ເອກະສານຂາອອກ',
    legal: 'ນິຕິກຳ',
    speech: 'ບົດໂອ້ລົມ',
    pending: 'ລໍຖ້າດຳເນີນການ',
    analytics: 'ສະຖິຕິ & ກຣາຟລາຍເດືອນ',
  };

  const defaultFormDirection =
    activeSection === 'outgoing'
      ? DocumentDirection.OUTGOING
      : activeSection === 'legal'
      ? DocumentDirection.LEGAL
      : activeSection === 'speech'
      ? DocumentDirection.SPEECH
      : DocumentDirection.INCOMING;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors print:hidden">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        stats={stats}
        isDemoMode={isDemoMode}
        isSoleAdmin={isSoleAdmin}
        pendingApprovalsCount={pendingApprovalsCount}
        userEmail={user?.email || null}
        userDisplayName={user?.displayName || null}
        userPhotoUrl={user?.photoURL || null}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenQrScanner={() => setQrScannerOpen(true)}
        onOpenAdminApprovals={() => setAdminApprovalsOpen(true)}
        onLogout={handleLogout}
        onRequestGoogleLogin={handleGoogleLogin}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="ເປີດເມນູນຳທາງ"
              className="lg:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {sectionTitles[activeSection]}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {isSoleAdmin && (
              <button
                type="button"
                onClick={() => setAdminApprovalsOpen(true)}
                data-testid="header-admin-approvals-btn"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Admin{pendingApprovalsCount > 0 ? ` (${pendingApprovalsCount})` : ''}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setQrScannerOpen(true)}
              data-testid="header-qr-scanner-btn"
              aria-label="ສະແກນ QR Code ເປີດເອກະສານ"
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <span className="hidden sm:inline">ສະແກນ QR</span>
            </button>

            {!isDemoMode && connection && (
              <a
                href={connection.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
              >
                <span>Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}

            <PWAInstallButton variant="header" />

            <ThemeToggleButton theme={theme} onToggle={handleToggleTheme} />

            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(true);
                setPermissionState(getNotificationPermissionState());
                void getDesktopPushState().then(setDesktopPushState);
              }}
              aria-label="ສູນການແຈ້ງເຕືອນ"
              className="relative p-2 min-w-[40px] min-h-[40px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {notifications.some((n) => !n.read) && (
                <span
                  data-testid="unread-notifications-count"
                  className="ml-1 text-xs font-mono-tabular font-bold text-blue-700 dark:text-blue-400"
                >
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleRefreshSync}
              disabled={isSyncing || isLoadingDocs}
              aria-label="ຊິ້ງຂໍ້ມູນລ່າສຸດ"
              className="p-2 min-w-[40px] min-h-[40px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing || isLoadingDocs ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[42px] text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>ເພີ່ມເອກະສານ</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
          {bannerError && (
            <div
              role="alert"
              className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl px-4 py-3 text-sm text-red-800 dark:text-red-300 flex items-center justify-between gap-3"
            >
              <span>{bannerError}</span>
              <button
                type="button"
                onClick={() => setBannerError(null)}
                className="text-xs font-semibold underline shrink-0"
              >
                ປິດ
              </button>
            </div>
          )}

          {isDemoMode && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span>
                ກຳລັງໃຊ້ງານໃນ <strong className="text-slate-900 dark:text-slate-100">ໂໝດທົດລອງ (ຂໍ້ມູນຕົວຢ່າງ)</strong>{' '}
                · ເພື່ອບັນທຶກຂໍ້ມູນລົງ Google Sheets ແລະ Drive ຕົວຈິງ ກະລຸນາເຂົ້າສູ່ລະບົບດ້ວຍ Google.
              </span>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                ເຂົ້າສູ່ລະບົບ Google
              </button>
            </div>
          )}

          {activeSection === 'analytics' ? (
            <DocumentAnalyticsView
              documents={documents}
              onFilterByMonth={handleFilterByMonth}
              theme={theme}
            />
          ) : (
            <>
              {/* KPI Summary Strip */}
              <section
                aria-label="ສະຫຼຸບຈຳນວນເອກະສານ"
                className="bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px"
              >
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">ເອກະສານທັງໝົດ</span>
                    <ChannelEmblem direction="all" size="sm" />
                  </div>
                  <div
                    data-testid="stat-total"
                    className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-1.5"
                  >
                    {stats.total}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">ເອກະສານຂາເຂົ້າ</span>
                    <ChannelEmblem direction={DocumentDirection.INCOMING} size="sm" />
                  </div>
                  <div
                    data-testid="stat-incoming"
                    className="text-2xl font-bold font-mono-tabular text-blue-700 dark:text-blue-400 mt-1.5"
                  >
                    {stats.incoming}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">ເອກະສານຂາອອກ</span>
                    <ChannelEmblem direction={DocumentDirection.OUTGOING} size="sm" />
                  </div>
                  <div
                    data-testid="stat-outgoing"
                    className="text-2xl font-bold font-mono-tabular text-teal-700 dark:text-teal-400 mt-1.5"
                  >
                    {stats.outgoing}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">ນິຕິກຳ</span>
                    <ChannelEmblem direction={DocumentDirection.LEGAL} size="sm" />
                  </div>
                  <div
                    data-testid="stat-legal"
                    className="text-2xl font-bold font-mono-tabular text-indigo-700 dark:text-indigo-400 mt-1.5"
                  >
                    {stats.legal}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">ບົດໂອ້ລົມ</span>
                    <ChannelEmblem direction={DocumentDirection.SPEECH} size="sm" />
                  </div>
                  <div
                    data-testid="stat-speech"
                    className="text-2xl font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-1.5"
                  >
                    {stats.speech}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">ລໍຖ້າ / ກຳລັງດຳເນີນການ</span>
                    <ChannelEmblem direction="pending" size="sm" />
                  </div>
                  <div
                    data-testid="stat-pending"
                    className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-1.5"
                  >
                    {stats.pendingAction}
                  </div>
                </div>
              </section>

              <SearchFilterBar
                filters={filters}
                totalResults={filteredDocuments.length}
                onChange={handleFiltersChange}
                onReset={() => {
                  setFilters(DEFAULT_FILTERS);
                  setActiveSection('all');
                }}
                onExportCsv={handleExportCsv}
                onExportExcel={handleExportExcel}
                onOpenQrScanner={() => setQrScannerOpen(true)}
              />

              <DocumentList
                documents={filteredDocuments}
                isLoading={isLoadingDocs}
                hasActiveFilters={hasActiveFilters}
                onView={(doc) => setViewingRecord(doc)}
                onEdit={handleOpenEditModal}
                onDelete={handleRequestDelete}
                onCreateNew={handleOpenCreateModal}
                onResetFilters={() => {
                  setFilters(DEFAULT_FILTERS);
                  setActiveSection('all');
                }}
              />
            </>
          )}
        </main>
      </div>

      <DocumentFormModal
        open={formOpen}
        mode={formMode}
        initialRecord={editingRecord}
        defaultDirection={defaultFormDirection}
        isDemoMode={isDemoMode}
        storageMode={localDriveConfig.mode}
        isSubmitting={isMutating}
        onUploadFileToDrive={handleUploadFileToDrive}
        onNotifyToast={showToast}
        onSubmit={handleFormSubmit}
        onClose={() => setFormOpen(false)}
      />

      <DocumentDetailModal
        record={viewingRecord}
        onNotifyToast={showToast}
        onClose={() => setViewingRecord(null)}
        onEdit={handleOpenEditModal}
        onDelete={handleRequestDelete}
      />

      <QrScannerModal
        open={qrScannerOpen}
        documents={documents}
        onSelectDocument={(doc) => setViewingRecord(doc)}
        onClose={() => setQrScannerOpen(false)}
      />

      <WorkspaceSettingsModal
        open={settingsOpen}
        isDemoMode={isDemoMode}
        connection={connection}
        localConfig={localDriveConfig}
        documents={documents}
        isBusy={isSyncing}
        onUpdateLocalConfig={(next) => {
          setLocalDriveConfig(next);
          saveLocalDriveConfig(next);
        }}
        onSyncLocalExcel={handleSyncLocalExcel}
        onDownloadExcel={handleExportExcel}
        onImportExcelDocuments={handleImportExcelDocuments}
        onLinkSpreadsheetId={handleLinkSpreadsheetId}
        onCreateNewSpreadsheet={handleCreateNewSpreadsheet}
        onRefreshSync={handleRefreshSync}
        onClose={() => setSettingsOpen(false)}
      />

      {isSoleAdmin && (
        <AdminApprovalsModal
          open={adminApprovalsOpen}
          adminEmail={user?.email || 'chanthathonglith@gmail.com'}
          requests={adminRequests}
          sharedConfig={sharedWorkspaceConfig}
          currentSpreadsheetId={connection?.spreadsheetId}
          currentSpreadsheetTitle={connection?.spreadsheetTitle}
          onApprove={async (uid, note) => {
            await reviewAccessRequest({
              uid,
              status: 'approved',
              adminEmail: user?.email || 'chanthathonglith@gmail.com',
              adminNote: note,
            });
            showToast({
              variant: 'success',
              title: 'ອະນຸມັດຜູ້ໃຊ້ສຳເລັດ',
            });
          }}
          onReject={async (uid, note) => {
            await reviewAccessRequest({
              uid,
              status: 'rejected',
              adminEmail: user?.email || 'chanthathonglith@gmail.com',
              adminNote: note,
            });
            showToast({
              variant: 'info',
              title: 'ປະຕິເສດຄຳຂໍແລ້ວ',
            });
          }}
          onDeleteRequest={async (uid) => {
            await removeAccessRequest(uid);
            showToast({
              variant: 'info',
              title: 'ລຶບລາຍການຄຳຂໍແລ້ວ',
            });
          }}
          onPublishSharedSheet={async () => {
            if (!connection) return;
            await saveSharedWorkspaceConfig({
              spreadsheetId: connection.spreadsheetId,
              spreadsheetTitle: connection.spreadsheetTitle,
              adminEmail: user?.email || 'chanthathonglith@gmail.com',
            });
            const latest = await fetchSharedWorkspaceConfig();
            setSharedWorkspaceConfig(latest);
            showToast({
              variant: 'success',
              title: 'ແຊຣ໌ Google Sheet ໃຫ້ທີມສຳເລັດ',
              description: connection.spreadsheetTitle,
            });
          }}
          onClose={() => setAdminApprovalsOpen(false)}
        />
      )}

      <NotificationModal
        open={notificationsOpen}
        permissionState={permissionState}
        desktopPushState={desktopPushState}
        isSubscribingPush={isSubscribingPush}
        settings={notificationSettings}
        notifications={notifications}
        onRequestPermission={async () => {
          const nextPermission = await requestBrowserNotificationPermission();
          setPermissionState(nextPermission);
          if (nextPermission === 'granted') {
            showToast({
              variant: 'success',
              title: 'ເປີດການແຈ້ງເຕືອນສຳເລັດ',
              description: 'ເປີດໃຊ້ງານການແຈ້ງເຕືອນ Browser ສຳເລັດແລ້ວ',
            });
          }
        }}
        onEnableDesktopPush={async () => {
          setIsSubscribingPush(true);
          try {
            const watches = buildDocumentWatchItems(documents);
            const result = await subscribeDesktopPush(notificationSettings, watches);
            setPermissionState(result.permission);
            setDesktopPushState(result.state);
            if (result.ok) {
              showToast({
                variant: 'success',
                title: 'ເປີດ Desktop & Lock Screen Push ສຳເລັດ',
                description: 'ລະບົບຈະແຈ້ງເຕືອນເທິງໜ້າຈໍລັອກ ແລະ Desktop ແມ້ປິດ Browser ແລ້ວ',
              });
            } else {
              showToast({
                variant: 'error',
                title: 'ບໍ່ສາມາດສະໝັກ Desktop Push',
                description: result.error || 'ກະລຸນາກວດສອບສິດການແຈ້ງເຕືອນຂອງ Browser',
              });
            }
          } finally {
            setIsSubscribingPush(false);
          }
        }}
        onDisableDesktopPush={async () => {
          setIsSubscribingPush(true);
          try {
            const nextState = await unsubscribeDesktopPush();
            setDesktopPushState(nextState);
            showToast({
              variant: 'info',
              title: 'ປິດຮັບ Desktop Push ພື້ນຫຼັງແລ້ວ',
            });
          } finally {
            setIsSubscribingPush(false);
          }
        }}
        onUpdateSettings={(next) => {
          setNotificationSettings(next);
          saveNotificationSettings(next);
        }}
        onSendTestNotification={async () => {
          let deliveredViaPush = false;
          if (desktopPushState.subscribed && notificationSettings.backgroundPushEnabled) {
            const pushResult = await sendServerPushTest(
              notificationSettings,
              desktopPushState.subscriptionEndpoint
            );
            deliveredViaPush = pushResult.delivered > 0;
          }

          if (deliveredViaPush) {
            setNotifications((prev) => [
              {
                id: `NTF-TEST-${Date.now()}`,
                type: NotificationTriggerType.TEST,
                title: 'ທົດສອບ Desktop & Lock Screen Push',
                body: 'ສົ່ງຜ່ານ Server Web Push ສຳເລັດ — ຮອງຮັບ Desktop & ໜ້າຈໍລັອກແມ້ປິດ Browser.',
                createdAt: new Date().toISOString(),
                read: false,
              },
              ...prev,
            ].slice(0, 50));
          } else {
            await dispatchNotification({
              type: NotificationTriggerType.TEST,
              title: 'ທົດສອບລະບົບແຈ້ງເຕືອນ Desktop & Lock Screen',
              body: 'ລະບົບຈະແຈ້ງເຕືອນທັນທີເມື່ອມີເອກະສານໃໝ່ໃນ Google Sheets ຫຼື ຮອດວັນທີກຳນົດ.',
              tag: `test-${Date.now()}`,
            });
          }

          showToast({
            variant: 'success',
            title: 'ສົ່ງການແຈ້ງເຕືອນທົດສອບແລ້ວ',
            description: deliveredViaPush
              ? 'ສົ່ງຜ່ານ Web Push ສຳເລັດ'
              : 'ສົ່ງການແຈ້ງເຕືອນຜ່ານ Service Worker ແລ້ວ',
          });
        }}
        onCheckDueNow={async () => {
          const count = await runDueDateCheck(documents, true);
          if (count > 0) {
            showToast({
              variant: 'info',
              title: 'ກວດພົບເອກະສານຮອດກຳນົດ',
              description: `ພົບເອກະສານຮອດກຳນົດ ${count} ລາຍການ ແລະ ແຈ້ງເຕືອນແລ້ວ`,
            });
          } else {
            showToast({
              variant: 'info',
              title: 'ບໍ່ພົບເອກະສານຮອດກຳນົດ',
              description: 'ບໍ່ພົບເອກະສານທີ່ຮອດ ຫຼື ເກີນວັນທີກຳນົດໃນເວລານີ້',
            });
          }
        }}
        onSelectDocument={(docId) => {
          const found = documents.find((d) => d.id === docId);
          if (found) setViewingRecord(found);
        }}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
        }
        onClearAll={() => setNotifications([])}
        onClose={() => setNotificationsOpen(false)}
      />

      <ConfirmDialog
        open={pendingMutation !== null}
        title={
          pendingMutation?.type === 'delete'
            ? 'ຢືນຢັນການລຶບເອກະສານ'
            : 'ຢືນຢັນການແກ້ໄຂຂໍ້ມູນເອກະສານ'
        }
        description={
          pendingMutation?.type === 'delete'
            ? `ທ່ານຕ້ອງການລຶບເອກະສານເລກທີ "${pendingMutation.record.docNumber}" (${pendingMutation.record.title}) ${
                isDemoMode
                  ? 'ອອກຈາກລາຍການຕົວຢ່າງຫຼືບໍ່?'
                  : 'ອອກຈາກ Google Sheets ແລະ Google Drive ຫຼືບໍ່? ການກະທຳນີ້ບໍ່ສາມາດກູ້ຄືນໄດ້.'
              }`
            : pendingMutation?.type === 'edit'
            ? `ທ່ານຕ້ອງການບັນທຶກການປ່ຽນແປງຂອງເອກະສານເລກທີ "${pendingMutation.input.docNumber}" ລົງໃນ ${
                isDemoMode ? 'ລະບົບ' : 'Google Sheets'
              } ຫຼືບໍ່?`
            : ''
        }
        confirmLabel={
          pendingMutation?.type === 'delete' ? 'ຢືນຢັນການລຶບ' : 'ຢືນຢັນການບັນທຶກ'
        }
        variant={pendingMutation?.type === 'delete' ? 'danger' : 'primary'}
        isBusy={isMutating}
        onConfirm={handleConfirmMutation}
        onCancel={() => setPendingMutation(null)}
      />

      <OfflineIndicator />
      <ToastViewport toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
