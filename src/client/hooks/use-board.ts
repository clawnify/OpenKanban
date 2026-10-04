import { useState, useCallback, useEffect, useRef } from "preact/hooks";
import { api } from "../api";
import { planMove } from "../move";
import type { BoardData } from "../types";
import type { BoardContextValue } from "../context";

export function useBoardState(isAgent: boolean): BoardContextValue {
  const [board, setBoard] = useState<BoardData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ lists: BoardData }>("GET", "/api/lists");
      setBoard(data.lists || []);
    } catch (err) {
      setError("Failed to load board: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Creates run one at a time: the server gives a new list or card
  // max(position) + 1, so several entered in quick succession could otherwise
  // get the same position.
  const createQueue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueCreate = useCallback((create: () => Promise<unknown>) => {
    const run = createQueue.current.then(async () => {
      await create();
      await refresh();
    });
    createQueue.current = run.catch(() => {});
    return run;
  }, [refresh]);

  const addList = useCallback(
    (title: string) => enqueueCreate(() => api("POST", "/api/lists", { title })),
    [enqueueCreate],
  );

  const renameList = useCallback(async (id: number, title: string) => {
    await api("PUT", `/api/lists/${id}`, { title });
    await refresh();
  }, [refresh]);

  const deleteList = useCallback(async (id: number) => {
    await api("DELETE", `/api/lists/${id}`);
    await refresh();
  }, [refresh]);

  const addCard = useCallback(
    (listId: number, title: string, description?: string) =>
      enqueueCreate(() => api("POST", "/api/cards", { list_id: listId, title, description: description || "" })),
    [enqueueCreate],
  );

  const editCard = useCallback(async (cardId: number, title: string, description: string) => {
    await api("PUT", `/api/cards/${cardId}`, { title, description });
    await refresh();
  }, [refresh]);

  const deleteCard = useCallback(async (cardId: number) => {
    await api("DELETE", `/api/cards/${cardId}`);
    await refresh();
  }, [refresh]);

  // Optimistic: show the card in its new place immediately, then sync with
  // the server (which also reverts the board if the request fails).
  const moveCard = useCallback(async (cardId: number, targetListId: number, index: number) => {
    const plan = planMove(boardRef.current, cardId, targetListId, index);
    if (!plan) return;
    boardRef.current = plan.board;
    setBoard(plan.board);
    try {
      await api("POST", `/api/cards/${cardId}/move`, { target_list_id: targetListId, position: plan.position });
    } finally {
      await refresh();
    }
  }, [refresh]);

  return {
    board, isAgent, loading, error, setError, refresh,
    addList, renameList, deleteList,
    addCard, editCard, deleteCard, moveCard,
  };
}
