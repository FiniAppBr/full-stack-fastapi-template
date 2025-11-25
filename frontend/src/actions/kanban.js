import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const enableServer = true;

const KANBAN_ENDPOINT = endpoints.pipeline;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
};

// ----------------------------------------------------------------------

export function useGetBoard() {
  const { data, isLoading, error, isValidating } = useSWR(KANBAN_ENDPOINT, fetcher, swrOptions);

  const memoizedValue = useMemo(() => {
    const tasks = data?.board.tasks ?? {};
    const columns = data?.board.columns ?? [];

    return {
      board: { tasks, columns },
      boardLoading: isLoading,
      boardError: error,
      boardValidating: isValidating,
      boardEmpty: !isLoading && !columns.length,
    };
  }, [data?.board.columns, data?.board.tasks, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createColumn(columnData) {
  if (enableServer) {
    const data = { columnData };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'create-column' } });
    mutate(KANBAN_ENDPOINT);
  }
}

// ----------------------------------------------------------------------

export async function updateColumn(columnId, columnName) {
  if (enableServer) {
    const data = { columnId, columnName };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'update-column' } });
    mutate(KANBAN_ENDPOINT);
  }
}

// ----------------------------------------------------------------------

export async function moveColumn(updateColumns) {
  // Optimistic update
  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { board } = currentData;
      return { ...currentData, board: { ...board, columns: updateColumns } };
    },
    false
  );

  if (enableServer) {
    const data = { updateColumns };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'move-column' } });
    mutate(KANBAN_ENDPOINT);
  }
}

// ----------------------------------------------------------------------

export async function clearColumn(columnId) {
  if (enableServer) {
    const data = { columnId };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'clear-column' } });
    mutate(KANBAN_ENDPOINT);
  }
}

// ----------------------------------------------------------------------

export async function deleteColumn(columnId) {
  if (enableServer) {
    const data = { columnId };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'delete-column' } });
    mutate(KANBAN_ENDPOINT);
  }
}

// ----------------------------------------------------------------------

export async function createTask(columnId, taskData) {
  if (enableServer) {
    const data = { columnId, taskData };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'create-task' } });
    mutate(KANBAN_ENDPOINT);
  }
}

// ----------------------------------------------------------------------

export async function updateTask(taskId, taskData) {
  // Optimistic update
  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      if (!currentData) return currentData;
      const { board } = currentData;
      const updatedTasks = { ...board.tasks };

      // Find and update the task
      for (const columnId of Object.keys(updatedTasks)) {
        updatedTasks[columnId] = updatedTasks[columnId].map((task) =>
          task.id === taskId ? { ...task, ...taskData } : task
        );
      }

      return { ...currentData, board: { ...board, tasks: updatedTasks } };
    },
    false
  );

  if (enableServer) {
    try {
      const data = { taskId, taskData: { id: taskId, ...taskData } };
      await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'update-task' } });
      mutate(KANBAN_ENDPOINT);
    } catch (error) {
      console.error('Failed to update task:', error);
      mutate(KANBAN_ENDPOINT); // Revalidate on error
    }
  }
}

// ----------------------------------------------------------------------

export async function deleteTask(columnId, taskId) {
  // Optimistic update
  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      if (!currentData) return currentData;
      const { board } = currentData;
      const updatedTasks = { ...board.tasks };

      // Remove the task from its column
      if (updatedTasks[columnId]) {
        updatedTasks[columnId] = updatedTasks[columnId].filter((task) => task.id !== taskId);
      }

      return { ...currentData, board: { ...board, tasks: updatedTasks } };
    },
    false
  );

  if (enableServer) {
    try {
      const data = { columnId, taskId };
      await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'delete-task' } });
      mutate(KANBAN_ENDPOINT);
    } catch (error) {
      console.error('Failed to delete task:', error);
      mutate(KANBAN_ENDPOINT); // Revalidate on error
    }
  }
}

// ----------------------------------------------------------------------

export async function moveTask(updateTasks) {
  // Optimistic update first
  mutate(
    KANBAN_ENDPOINT,
    (currentData) => {
      const { board } = currentData;
      return { ...currentData, board: { ...board, tasks: updateTasks } };
    },
    false
  );

  // Persist to server
  if (enableServer) {
    try {
      const data = { updateTasks };
      await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'move-task' } });
      mutate(KANBAN_ENDPOINT);
    } catch (error) {
      console.error('Failed to move task:', error);
      mutate(KANBAN_ENDPOINT);
    }
  }
}

// ----------------------------------------------------------------------

export async function reorderTask(columnId, fromIndex, toIndex) {
  // This is handled by moveTask with the full updateTasks object
}
