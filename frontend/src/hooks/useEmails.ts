import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Email } from '../types';

const PAGE = 50;
const POLL_MS = 10_000;

export function useEmails(tab: 'scheduled' | 'sent', q: string) {
  const [items, setItems] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lenRef = useRef(0);
  const reqId = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++reqId.current;
      if (!silent) setLoading(true);
      try {
        const res = await api.listEmails(tab, q, Math.max(lenRef.current, PAGE));
        if (id !== reqId.current) return; // a newer request superseded this one
        setItems(res.items);
        lenRef.current = res.items.length;
        setTotal(res.total);
        setError(null);
      } catch (e) {
        if (id === reqId.current && !silent) setError((e as Error).message);
      } finally {
        if (id === reqId.current && !silent) setLoading(false);
      }
    },
    [tab, q],
  );

  useEffect(() => {
    lenRef.current = 0;
    setItems([]);
    load();
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.listEmails(tab, q, PAGE, items.length);
      setItems((prev) => [...prev, ...res.items]);
      lenRef.current += res.items.length;
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  return { items, total, loading, loadingMore, error, reload: () => load(), loadMore };
}
