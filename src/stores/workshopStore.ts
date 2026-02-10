import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════
// Workshop Store — Kanban tasks with localStorage persistence
// ═══════════════════════════════════════════════════════════

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'queue' | 'inProgress' | 'done';
  createdAt: string;
  tags: string[];
  assignedAgent?: string;
  progress?: number; // 0-100, for inProgress tasks
}

interface WorkshopState {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'tags'>) => void;
  moveTask: (id: string, status: Task['status']) => void;
  deleteTask: (id: string) => void;
  reorderInColumn: (status: Task['status'], orderedIds: string[]) => void;
  setProgress: (id: string, progress: number) => void;
}

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set) => ({
      tasks: [
        {
          id: 'demo-1',
          title: 'إطلاق AEGIS Desktop v4.0',
          description: 'بناء النسخة النهائية + NSIS Installer + Portable',
          priority: 'high' as const,
          status: 'inProgress' as const,
          createdAt: new Date().toISOString(),
          tags: ['release'],
          assignedAgent: 'Toka 🔥',
          progress: 75,
        },
        {
          id: 'demo-2',
          title: 'تحسين صفحة الذاكرة',
          description: 'تحميل تلقائي + شريط ملون + فلاتر التصنيف',
          priority: 'high' as const,
          status: 'done' as const,
          createdAt: new Date().toISOString(),
          tags: ['ui'],
          assignedAgent: 'Deacu 🔮',
          progress: 100,
        },
        {
          id: 'demo-3',
          title: 'نظام Themes متعدد',
          description: 'Ocean Dark + Midnight + Light — تبديل فوري',
          priority: 'medium' as const,
          status: 'queue' as const,
          createdAt: new Date().toISOString(),
          tags: ['v5.0'],
        },
        {
          id: 'demo-4',
          title: 'Auto-update mechanism',
          description: 'التحقق من تحديثات + تنزيل تلقائي',
          priority: 'low' as const,
          status: 'queue' as const,
          createdAt: new Date().toISOString(),
          tags: ['v5.0'],
        },
        {
          id: 'demo-5',
          title: 'Notification Center',
          description: 'تاريخ الإشعارات + Bell badge في TitleBar',
          priority: 'medium' as const,
          status: 'done' as const,
          createdAt: new Date().toISOString(),
          tags: ['ui'],
          assignedAgent: 'Avii ⚡',
          progress: 100,
        },
        {
          id: 'demo-6',
          title: 'تصدير تقرير التكاليف',
          description: 'CSV download + نسخ ملخص للـ clipboard',
          priority: 'medium' as const,
          status: 'inProgress' as const,
          createdAt: new Date().toISOString(),
          tags: ['feature'],
          assignedAgent: 'Sadem 🌙',
          progress: 50,
        },
      ],

      addTask: (partial) => set((state) => ({
        tasks: [...state.tasks, {
          ...partial,
          id: Date.now().toString(),
          status: 'queue',
          createdAt: new Date().toISOString(),
          tags: [],
        }],
      })),

      moveTask: (id, status) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t),
      })),

      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      })),

      setProgress: (id, progress) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, progress } : t),
      })),

      reorderInColumn: (status, orderedIds) => set((state) => {
        const others = state.tasks.filter((t) => t.status !== status);
        const columnTasks = orderedIds
          .map((id) => state.tasks.find((t) => t.id === id))
          .filter(Boolean) as Task[];
        return { tasks: [...others, ...columnTasks] };
      }),
    }),
    { name: 'aegis-workshop-tasks' }
  )
);
