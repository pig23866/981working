import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Assignment,
  Subject,
  ViewMode,
  AssignmentStatus,
  CourseEntry,
  SessionUser,
  AssignmentProgress,
  AppUser,
} from './types';
import { DEFAULT_SUBJECTS } from './lib/constants';
import {
  loadStoredAssignments,
  saveStoredAssignments,
  clearAllStoredAssignments,
  loadStoredSubjects,
  saveStoredSubjects,
} from './lib/storage';
import {
  loadStoredSchedule,
  saveStoredSchedule,
} from './lib/scheduleData';
import {
  loadCurrentSession,
  logoutSession,
  syncUsersFromCloud,
  loadUsers,
  ensureSeedUsersSyncedToCloud,
  OFFICIAL_STUDENT_SEEDS,
} from './lib/auth';
import { logAuditEvent } from './lib/auditLogger';
import { getUrgencyInfo } from './lib/dateUtils';
import { sendBrowserNotification, playChime } from './lib/notifications';
import { getSampleDemoAssignments } from './lib/initialData';
import {
  subscribeToAssignments,
  saveAssignmentToCloud,
  deleteAssignmentFromCloud,
  clearAllAssignmentsInCloud,
  subscribeToSchedule,
  saveScheduleToCloud,
  subscribeToUsers,
  manualSyncAllData,
  subscribeToUserProgress,
  subscribeToAllProgress,
  saveAssignmentProgressToCloud,
  deleteAssignmentProgressForAssignment,
} from './lib/firebase';

import { Navbar } from './components/Navbar';
import { DeadlineAlertBanner } from './components/DeadlineAlertBanner';
import { CurrentClassBanner } from './components/CurrentClassBanner';
import { WeeklyScheduleModal } from './components/WeeklyScheduleModal';
import { WeeklyScheduleView } from './components/WeeklyScheduleView';
import { SubjectFilterBar } from './components/SubjectFilterBar';
import { AssignmentCard } from './components/AssignmentCard';
import { BoardView } from './components/BoardView';
import { CalendarView } from './components/CalendarView';
import { SubjectOverviewView } from './components/SubjectOverviewView';
import { AssignmentModal } from './components/AssignmentModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AuditLogModal } from './components/AuditLogModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { AssignmentProgressModal } from './components/AssignmentProgressModal';
import { ClassProgressOverviewModal } from './components/ClassProgressOverviewModal';

import {
  Inbox,
  Plus,
  BookOpen,
} from 'lucide-react';

export default function App() {
  // Theme State (Dark mode toggle support via CSS & Tailwind)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme_mode');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark class to <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme_mode', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Authentication & Role State (訪客不能存取內容需要登入)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => loadCurrentSession());
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [isBackupRestoreModalOpen, setIsBackupRestoreModalOpen] = useState(false);

  // Assignments & Subjects state
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadStoredAssignments());
  const [subjects, setSubjects] = useState<Subject[]>(() => loadStoredSubjects());
  const [courses, setCourses] = useState<CourseEntry[]>(() => loadStoredSchedule());

  // Personal Assignment Progress & Users state (全班題目共用，個人獨立完成進度)
  const [allUsers, setAllUsers] = useState<AppUser[]>(() => loadUsers());
  const [progressList, setProgressList] = useState<AssignmentProgress[]>([]);

  // Filter & View State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'subject'>('deadline');
  const [isUrgentFilterActive, setIsUrgentFilterActive] = useState(false);

  // Notification State
  const [notificationGranted, setNotificationGranted] = useState<boolean>(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });

  // Modal States
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [prefillAssignmentData, setPrefillAssignmentData] = useState<{
    title?: string;
    subjectId?: string;
    notes?: string;
    description?: string;
  } | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isClassOverviewOpen, setIsClassOverviewOpen] = useState(false);
  const [selectedAssignmentForProgress, setSelectedAssignmentForProgress] = useState<Assignment | null>(null);

  // Confirmation Modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Save assignments on change (localStorage cache)
  useEffect(() => {
    saveStoredAssignments(assignments);
  }, [assignments]);

  // Save subjects on change
  useEffect(() => {
    saveStoredSubjects(subjects);
  }, [subjects]);

  // Save courses on change
  useEffect(() => {
    saveStoredSchedule(courses);
  }, [courses]);

  // Real-time synchronization with Cloud Firestore (即時雲端同步)
  useEffect(() => {
    let hasLoadedCloudAssignments = false;

    const unsubscribeAssignments = subscribeToAssignments(
      (cloudAssignments) => {
        if (!hasLoadedCloudAssignments) {
          hasLoadedCloudAssignments = true;
          // If cloud already has assignments, load them
          if (cloudAssignments.length > 0) {
            setAssignments(cloudAssignments);
            saveStoredAssignments(cloudAssignments);
          } else {
            // First time seeding: if local has existing assignments, upload them to cloud
            const local = loadStoredAssignments();
            if (local.length > 0) {
              local.forEach((asg) => {
                saveAssignmentToCloud(asg).catch(() => {});
              });
            }
          }
        } else {
          setAssignments(cloudAssignments);
          saveStoredAssignments(cloudAssignments);
        }
      },
      (err) => {
        console.warn('Real-time assignment sync notice:', err);
      }
    );

    const unsubscribeSchedule = subscribeToSchedule(
      (cloudCourses) => {
        if (cloudCourses && cloudCourses.length > 0) {
          setCourses(cloudCourses);
          saveStoredSchedule(cloudCourses);
        }
      },
      (err) => {
        console.warn('Real-time schedule sync notice:', err);
      }
    );

    // Ensure all 14 official student accounts and Admin are properly uploaded to Cloud Firestore
    ensureSeedUsersSyncedToCloud().catch((err) => {
      console.warn('Initial seed users upload notice:', err);
    });

    // Live synchronization with Firestore user accounts collection (帳號資料庫即時同步)
    const unsubscribeUsers = subscribeToUsers(
      (cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          syncUsersFromCloud(cloudUsers);
          setAllUsers(cloudUsers);
        }
      },
      (err) => {
        console.warn('Real-time users sync notice:', err);
      }
    );

    return () => {
      unsubscribeAssignments();
      unsubscribeSchedule();
      unsubscribeUsers();
    };
  }, []);

  // Auto-refresh active session user displayName if official seed name changed (例如 98210 替代為 葉恩齊)
  useEffect(() => {
    if (currentUser) {
      const match = OFFICIAL_STUDENT_SEEDS.find((s) => s.username.toLowerCase() === currentUser.username.toLowerCase());
      if (match && currentUser.displayName !== match.displayName) {
        const updated = { ...currentUser, displayName: match.displayName };
        setCurrentUser(updated);
        sessionStorage.setItem('hw_auth_session_v2', JSON.stringify(updated));
        localStorage.setItem('hw_auth_session_v2', JSON.stringify(updated));
      }
    }
  }, [currentUser]);

  // Real-time synchronization for personal assignment progress (個人獨立完成進度即時監聽)
  useEffect(() => {
    if (!currentUser) {
      setProgressList([]);
      return;
    }

    if (currentUser.role === 'admin') {
      // 管理員：監聽全班所有人的繳交進度以供管理員隨時檢視
      const unsubscribe = subscribeToAllProgress(
        (allProgresses) => {
          setProgressList(allProgresses);
        },
        (err) => {
          console.warn('Real-time all progress sync notice:', err);
        }
      );
      return () => unsubscribe();
    } else {
      // 一般學員：只監聽個人的繳交進度（保護同儕隱私，不對學員公開他人進度）
      const unsubscribe = subscribeToUserProgress(
        currentUser.username,
        (userProgresses) => {
          setProgressList(userProgresses);
        },
        (err) => {
          console.warn('Real-time user progress sync notice:', err);
        }
      );
      return () => unsubscribe();
    }
  }, [currentUser]);

  // Map of current user's personal progress: assignmentId -> AssignmentProgress
  const currentUserProgressMap = useMemo(() => {
    const map = new Map<string, AssignmentProgress>();
    if (!currentUser) return map;
    const myUsername = currentUser.username.toLowerCase();
    progressList.forEach((p) => {
      if (p.username.toLowerCase() === myUsername) {
        map.set(p.assignmentId, p);
      }
    });
    return map;
  }, [progressList, currentUser]);

  // Regular student list (role === 'user')
  const studentUsers = useMemo(() => {
    return allUsers.filter((u) => u.role === 'user');
  }, [allUsers]);

  // Map of completed student count per assignment (管理員檢視統計用)
  const completedCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    progressList.forEach((p) => {
      if (p.status === 'completed' || p.status === 'submitted') {
        map[p.assignmentId] = (map[p.assignmentId] || 0) + 1;
      }
    });
    return map;
  }, [progressList]);

  // Periodic automatic deadline reminder engine (runs every 60 seconds)
  useEffect(() => {
    if (!currentUser) return;

    const checkDeadlines = () => {
      const now = new Date().getTime();
      assignments.forEach((asg) => {
        const myStatus = currentUserProgressMap.get(asg.id)?.status || 'todo';
        if (myStatus === 'completed' || myStatus === 'submitted') return;

        const dueTime = new Date(asg.deadline).getTime();
        const diffHours = (dueTime - now) / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 2 && !asg.reminderTriggered) {
          sendBrowserNotification(
            `作業期限提醒：${asg.title}`,
            `該作業將於約 ${Math.round(diffHours * 60)} 分鐘後截止，請把握時間繳交！`
          );
          playChime('urgent');

          setAssignments((prev) =>
            prev.map((a) => (a.id === asg.id ? { ...a, reminderTriggered: true } : a))
          );
        }
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000);
    return () => clearInterval(interval);
  }, [assignments, currentUser, currentUserProgressMap]);

  // Subject Counts Map
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => {
      counts[a.subjectId] = (counts[a.subjectId] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  // Filtered & Sorted Assignments (個人獨立篩選：待辦/完成依使用者各自進度過濾)
  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((asg) => {
        if (selectedSubjectId && asg.subjectId !== selectedSubjectId) {
          return false;
        }

        const myStatus = currentUserProgressMap.get(asg.id)?.status || 'todo';
        const isDone = myStatus === 'completed' || myStatus === 'submitted';

        if (statusFilter === 'pending' && isDone) {
          return false;
        }
        if (statusFilter === 'done' && !isDone) {
          return false;
        }

        if (isUrgentFilterActive) {
          const urgency = getUrgencyInfo(asg.deadline, myStatus);
          if (urgency.level !== 'overdue' && urgency.level !== 'today') {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = asg.title.toLowerCase().includes(q);
          const matchesDesc = asg.description?.toLowerCase().includes(q) || false;
          const matchesNotes = asg.notes?.toLowerCase().includes(q) || false;
          if (!matchesTitle && !matchesDesc && !matchesNotes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          const aStatus = currentUserProgressMap.get(a.id)?.status || 'todo';
          const bStatus = currentUserProgressMap.get(b.id)?.status || 'todo';
          const aDone = aStatus === 'completed' || aStatus === 'submitted';
          const bDone = bStatus === 'completed' || bStatus === 'submitted';
          if (aDone !== bDone) return aDone ? 1 : -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }

        if (sortBy === 'priority') {
          const weight = { high: 3, medium: 2, low: 1 };
          return weight[b.priority] - weight[a.priority];
        }

        if (sortBy === 'subject') {
          return a.subjectId.localeCompare(b.subjectId);
        }

        return 0;
      });
  }, [assignments, selectedSubjectId, statusFilter, isUrgentFilterActive, searchQuery, sortBy, currentUserProgressMap]);

  // Handlers for Assignment operations (自動同步至雲端 Firestore)
  const handleSaveAssignment = (assignmentToSave: Assignment) => {
    const isEditing = assignments.some((a) => a.id === assignmentToSave.id);

    // Instant local state update
    setAssignments((prev) => {
      const index = prev.findIndex((a) => a.id === assignmentToSave.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = assignmentToSave;
        return updated;
      }
      return [assignmentToSave, ...prev];
    });

    // Cloud Firestore synchronization
    saveAssignmentToCloud(assignmentToSave).catch((err) => {
      console.error('Failed to sync assignment to Firestore:', err);
    });

    if (currentUser) {
      logAuditEvent({
        category: 'assignment',
        action: isEditing ? '編輯作業' : '新增作業',
        actor: currentUser,
        target: assignmentToSave.title,
        details: isEditing
          ? `更新了作業「${assignmentToSave.title}」之詳細內容或繳交期限。`
          : `建立了新作業「${assignmentToSave.title}」，截止期限：${assignmentToSave.deadline}。`,
      });
    }

    setEditingAssignment(null);
  };

  const handleDeleteAssignment = (id: string) => {
    const target = assignments.find((a) => a.id === id);
    if (!target) return;

    setConfirmConfig({
      isOpen: true,
      title: '確認刪除作業？',
      message: `確定要刪除「${target.title}」嗎？此操作將自統整系統中移除此作業紀錄與所有學員的完成進度。`,
      isDestructive: true,
      onConfirm: () => {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
        deleteAssignmentFromCloud(id).catch((err) => {
          console.error('Failed to delete assignment from Firestore:', err);
        });
        deleteAssignmentProgressForAssignment(id).catch((err) => {
          console.error('Failed to clean up assignment progress in Firestore:', err);
        });

        if (currentUser) {
          logAuditEvent({
            category: 'assignment',
            action: '刪除作業',
            level: 'warn',
            actor: currentUser,
            target: target.title,
            details: `刪除了作業「${target.title}」。`,
          });
        }
        setConfirmConfig((c) => ({ ...c, isOpen: false }));
      },
    });
  };

  // Clear all assignments (清空作業清單)
  const handleClearAllAssignments = () => {
    if (assignments.length === 0) {
      setConfirmConfig({
        isOpen: true,
        title: '作業清單目前已是空的',
        message: '作業清單內目前無任何項目，您可以點擊「新增作業」建立新作業。',
        isDestructive: false,
        onConfirm: () => {
          setConfirmConfig((c) => ({ ...c, isOpen: false }));
        },
      });
      return;
    }

    const count = assignments.length;
    setConfirmConfig({
      isOpen: true,
      title: '確認清空所有作業清單？',
      message: `確定要清空目前全部 ${count} 筆作業嗎？清空後作業清單將還原為空白狀態。`,
      isDestructive: true,
      onConfirm: () => {
        clearAllStoredAssignments();
        setAssignments([]);
        setSelectedSubjectId(null);
        clearAllAssignmentsInCloud().catch((err) => {
          console.error('Failed to clear assignments in Firestore:', err);
        });

        if (currentUser) {
          logAuditEvent({
            category: 'assignment',
            action: '清空作業清單',
            level: 'warn',
            actor: currentUser,
            details: `執行清空全部作業，共清除了 ${count} 筆作業項目。`,
          });
        }
        setConfirmConfig((c) => ({ ...c, isOpen: false }));
        playChime('info');
      },
    });
  };

  // 個人獨立切換完成進度狀態 (不影響全班其他人，儲存至 assignment_progress)
  const handleStatusChange = (assignmentId: string, newStatus: AssignmentStatus) => {
    if (!currentUser) return;
    const target = assignments.find((a) => a.id === assignmentId);
    if (!target) return;

    const progressId = `${assignmentId}_${currentUser.username.toLowerCase()}`;
    const isDone = newStatus === 'completed' || newStatus === 'submitted';
    const progressEntry: AssignmentProgress = {
      id: progressId,
      assignmentId,
      username: currentUser.username,
      displayName: currentUser.displayName,
      status: newStatus,
      completedAt: isDone ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Instant local state update
    setProgressList((prev) => {
      const idx = prev.findIndex((p) => p.id === progressId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = progressEntry;
        return copy;
      }
      return [...prev, progressEntry];
    });

    // Cloud Firestore synchronization
    saveAssignmentProgressToCloud(progressEntry).catch((err) => {
      console.error('Failed to sync assignment progress to Firestore:', err);
    });

    logAuditEvent({
      category: 'assignment',
      action: '變更個人作業進度',
      actor: currentUser,
      target: target.title,
      details: `作業「${target.title}」個人狀態變更為「${newStatus}」。`,
    });
  };

  // 管理員代為變更或標記學員完成進度
  const handleToggleStudentStatus = async (
    assignmentId: string,
    student: AppUser,
    newStatus: AssignmentStatus
  ) => {
    const target = assignments.find((a) => a.id === assignmentId);
    const progressId = `${assignmentId}_${student.username.toLowerCase()}`;
    const isDone = newStatus === 'completed' || newStatus === 'submitted';
    const progressEntry: AssignmentProgress = {
      id: progressId,
      assignmentId,
      username: student.username,
      displayName: student.displayName,
      status: newStatus,
      completedAt: isDone ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    // Local instant update
    setProgressList((prev) => {
      const idx = prev.findIndex((p) => p.id === progressId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = progressEntry;
        return copy;
      }
      return [...prev, progressEntry];
    });

    // Firestore update
    await saveAssignmentProgressToCloud(progressEntry);

    if (currentUser) {
      logAuditEvent({
        category: 'assignment',
        action: '管理員代變更作業進度',
        actor: currentUser,
        target: target ? target.title : assignmentId,
        details: `管理員為學員 ${student.displayName} (${student.username}) 變更狀態為「${newStatus}」。`,
      });
    }
  };

  const handleToggleSubtask = (assignmentId: string, subtaskId: string) => {
    const target = assignments.find((a) => a.id === assignmentId);
    if (!target) return;

    const updatedAssignment: Assignment = {
      ...target,
      subtasks: target.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
      ),
      updatedAt: new Date().toISOString(),
    };

    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
    );

    saveAssignmentToCloud(updatedAssignment).catch((err) => {
      console.error('Failed to sync subtask toggle to Firestore:', err);
    });
  };

  const handleQuickAddFromCourse = (courseName: string, classroom: string, teacher: string) => {
    const cleanName = courseName.trim();
    const found = subjects.find(
      (s) => s.name === cleanName || cleanName.includes(s.name) || s.name.includes(cleanName)
    );
    const matchedSubjectId = found ? found.id : (subjects[0]?.id || 'course-cs-prog');

    setEditingAssignment(null);
    setPrefillAssignmentData({
      title: `${courseName} - 隨堂作業`,
      subjectId: matchedSubjectId,
      description: `於 ${classroom} 上課指派之隨堂作業（授課教官/老師：${teacher}）`,
      notes: `授課教官/老師：${teacher} | 上課地點：${classroom}`,
    });
    setIsAssignmentModalOpen(true);
  };

  const handleOpenAddModal = (defaultStatus?: AssignmentStatus, defaultSubjectId?: string) => {
    setEditingAssignment(null);
    setPrefillAssignmentData(null);
    if (defaultSubjectId) {
      setSelectedSubjectId(defaultSubjectId);
    }
    setIsAssignmentModalOpen(true);
  };

  const handleLogout = () => {
    if (currentUser) {
      logAuditEvent({
        category: 'auth',
        action: '登出系統',
        actor: currentUser,
        details: `${currentUser.displayName} 登出了系統。`,
      });
    }
    logoutSession();
    setCurrentUser(null);
    playChime('info');
  };

  // 手動主動強制從雲端拉取最新資料 (Refresh & Cloud Sync - 作業、課表、帳號資料庫與進度)
  const handleManualRefresh = async () => {
    try {
      const {
        assignments: cloudAssignments,
        courses: cloudCourses,
        users: cloudUsers,
        progresses: cloudProgresses,
      } = await manualSyncAllData();

      if (cloudAssignments.length > 0) {
        setAssignments(cloudAssignments);
        saveStoredAssignments(cloudAssignments);
      }
      if (cloudCourses.length > 0) {
        setCourses(cloudCourses);
        saveStoredSchedule(cloudCourses);
      }
      if (cloudUsers && cloudUsers.length > 0) {
        syncUsersFromCloud(cloudUsers);
        setAllUsers(cloudUsers);
      }
      if (cloudProgresses && cloudProgresses.length > 0) {
        setProgressList(cloudProgresses);
      }

      if (currentUser) {
        logAuditEvent({
          category: 'backup',
          action: '手動刷新同步',
          level: 'info',
          actor: currentUser,
          details: '手動重新整理同步最新資料與進度。',
        });
      }
    } catch (err) {
      console.error('Failed to sync data manually:', err);
    }
  };

  // If visitor is not logged in: display LoginView (訪客不能存取內容需要登入)
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => setCurrentUser(user)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation with Dark Mode Toggle & Role Authentication */}
      <Navbar
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenSchedule={() => setIsScheduleModalOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreModalOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogModalOpen(true)}
        onOpenClassOverview={() => setIsClassOverviewOpen(true)}
        onClearAllAssignments={handleClearAllAssignments}
        notificationGranted={notificationGranted}
        setNotificationGranted={setNotificationGranted}
        assignmentCount={assignments.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onManualRefresh={handleManualRefresh}
      />

      {/* Main Container - Optimized for Mobile & Desktop */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        {/* Real-time Timetable Widget (掌握現在課堂與下一節課教室地點) */}
        <CurrentClassBanner
          courses={courses}
          onOpenFullSchedule={() => setIsScheduleModalOpen(true)}
          onQuickAddAssignment={handleQuickAddFromCourse}
        />

        {/* Deadline Alert Banner (能自動提醒繳交期限) */}
        <DeadlineAlertBanner
          assignments={assignments}
          onFilterUrgent={() => setIsUrgentFilterActive(!isUrgentFilterActive)}
          isUrgentFilterActive={isUrgentFilterActive}
          notificationGranted={notificationGranted}
          setNotificationGranted={setNotificationGranted}
        />

        {/* Filter and Subject Category Bar with Subject Dropdown Menu */}
        <SubjectFilterBar
          subjects={subjects}
          selectedSubjectId={selectedSubjectId}
          onSelectSubject={setSelectedSubjectId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          subjectCounts={subjectCounts}
          totalCount={assignments.length}
        />

        {/* Main Content Area based on View Mode with smooth view-transition */}
        <div key={viewMode} className="view-transition">
          {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredAssignments.length === 0 ? (
                <div
                  id="empty-state-card"
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3 shadow-2xs">
                    <Inbox className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {assignments.length === 0 ? '作業清單目前已清空' : '查無相符作業項目'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                    {assignments.length === 0
                      ? '作業清單已維持空白狀態。您可以點擊下方按鈕新增作業，或從上方課堂動態直接登記隨堂作業。'
                      : '目前篩選條件下沒有作業，您可以清除篩選條件或點擊下方按鈕新增作業。'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {(selectedSubjectId || isUrgentFilterActive || searchQuery || statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(null);
                          setIsUrgentFilterActive(false);
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="btn-press px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                      >
                        清除所有篩選
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal()}
                      className="btn-press inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-200 dark:shadow-blue-900/40 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增作業</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      subject={subjectMap.get(assignment.subjectId)}
                      userProgress={currentUserProgressMap.get(assignment.id)}
                      currentUserRole={currentUser.role}
                      completedCount={completedCountMap[assignment.id] || 0}
                      totalStudentsCount={studentUsers.length}
                      onOpenProgressModal={() => setSelectedAssignmentForProgress(assignment)}
                      onEdit={(asg) => {
                        setEditingAssignment(asg);
                        setIsAssignmentModalOpen(true);
                      }}
                      onDelete={handleDeleteAssignment}
                      onStatusChange={handleStatusChange}
                      onToggleSubtask={handleToggleSubtask}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'board' && (
            <BoardView
              assignments={filteredAssignments}
              subjects={subjects}
              userProgressMap={currentUserProgressMap}
              currentUserRole={currentUser.role}
              completedCountMap={completedCountMap}
              totalStudentsCount={studentUsers.length}
              onOpenProgressModal={(asg) => setSelectedAssignmentForProgress(asg)}
              onEdit={(asg) => {
                setEditingAssignment(asg);
                setIsAssignmentModalOpen(true);
              }}
              onDelete={handleDeleteAssignment}
              onStatusChange={handleStatusChange}
              onToggleSubtask={handleToggleSubtask}
              onAddNewWithStatus={(st) => handleOpenAddModal(st)}
            />
          )}

          {viewMode === 'calendar' && (
            <CalendarView
              assignments={assignments}
              subjects={subjects}
              onSelectAssignment={(asg) => {
                setEditingAssignment(asg);
                setIsAssignmentModalOpen(true);
              }}
              onAddNewForDate={() => {
                setEditingAssignment(null);
                setIsAssignmentModalOpen(true);
              }}
            />
          )}

          {viewMode === 'schedule' && (
            <WeeklyScheduleView
              courses={courses}
              onSaveCourses={(updated) => {
                setCourses(updated);
                saveScheduleToCloud(updated).catch(() => {});
              }}
              onQuickAddAssignment={handleQuickAddFromCourse}
            />
          )}

          {viewMode === 'subjects' && (
            <SubjectOverviewView
              subjects={subjects}
              assignments={assignments}
              onSelectSubjectFilter={(id) => {
                setSelectedSubjectId(id);
                setViewMode('list');
              }}
              onEditAssignment={(asg) => {
                setEditingAssignment(asg);
                setIsAssignmentModalOpen(true);
              }}
              onAddNewForSubject={(id) => {
                handleOpenAddModal(undefined, id);
              }}
              onLoadSampleAssignments={() => {
                const samples = getSampleDemoAssignments();
                setAssignments(samples);
              }}
            />
          )}
        </div>
      </main>

      {/* Full Weekly Schedule Timetable Modal */}
      <WeeklyScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        courses={courses}
        onSaveCourses={(updated) => {
          setCourses(updated);
          saveScheduleToCloud(updated).catch(() => {});
        }}
        onQuickAddAssignment={handleQuickAddFromCourse}
      />

      {/* Assignment Create / Edit Modal */}
      <AssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setEditingAssignment(null);
          setPrefillAssignmentData(null);
        }}
        onSave={handleSaveAssignment}
        subjects={subjects}
        courses={courses}
        initialData={editingAssignment}
        prefillData={prefillAssignmentData}
      />

      {/* Change Password Modal (修改密碼選項) */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Admin User Management Modal (管理員新增 帳號建立與管理功能) */}
      {currentUser.role === 'admin' && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Backup & Restore System Modal (備份與復原系統：課表與作業) */}
      <BackupRestoreModal
        isOpen={isBackupRestoreModalOpen}
        onClose={() => setIsBackupRestoreModalOpen(false)}
        assignments={assignments}
        onRestoreAssignments={(restored) => {
          setAssignments(restored);
          restored.forEach((asg) => saveAssignmentToCloud(asg).catch(() => {}));
        }}
        courses={courses}
        onRestoreCourses={(restored) => {
          setCourses(restored);
          saveScheduleToCloud(restored).catch(() => {});
        }}
        currentUser={currentUser}
      />

      {/* Admin Audit Log Modal (日誌系統 只有管理員可以查看) */}
      {currentUser.role === 'admin' && (
        <AuditLogModal
          isOpen={isAuditLogModalOpen}
          onClose={() => setIsAuditLogModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Assignment Student Progress List Modal (管理員查看單一作業完成與待完成學員名單) */}
      {currentUser.role === 'admin' && (
        <AssignmentProgressModal
          isOpen={!!selectedAssignmentForProgress}
          onClose={() => setSelectedAssignmentForProgress(null)}
          assignment={selectedAssignmentForProgress}
          students={allUsers}
          progressList={progressList}
          onToggleStudentStatus={handleToggleStudentStatus}
        />
      )}

      {/* Class Progress Overview Matrix Modal (管理員全班繳交進度總表) */}
      {currentUser.role === 'admin' && (
        <ClassProgressOverviewModal
          isOpen={isClassOverviewOpen}
          onClose={() => setIsClassOverviewOpen(false)}
          assignments={assignments}
          students={allUsers}
          progressList={progressList}
          subjects={subjects}
          onToggleStudentStatus={handleToggleStudentStatus}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((c) => ({ ...c, isOpen: false }))}
      />
    </div>
  );
}
