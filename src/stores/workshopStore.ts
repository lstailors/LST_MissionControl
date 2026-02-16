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
      tasks: [],

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
