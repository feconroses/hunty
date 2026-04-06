"use client";

import { useState, useEffect, useCallback } from "react";
import type { Company, TaskType } from "@/types";
import {
  getCompanies,
  createCompany,
  updateCompany as apiUpdateCompany,
  deleteCompany as apiDeleteCompany,
  createTask as apiCreateTask,
} from "@/lib/api";

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCompanies({ source: "target" });
      setCompanies(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load companies";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCompany = useCallback(
    async (name: string, url: string) => {
      const company = await createCompany({ name, url });
      await fetchCompanies();
      return company;
    },
    [fetchCompanies],
  );

  const updateCompany = useCallback(
    async (id: number, data: Partial<Company>) => {
      const company = await apiUpdateCompany(id, data);
      await fetchCompanies();
      return company;
    },
    [fetchCompanies],
  );

  const deleteCompany = useCallback(
    async (id: number) => {
      await apiDeleteCompany(id);
      await fetchCompanies();
    },
    [fetchCompanies],
  );

  const createTask = useCallback(
    async (companyId: number, taskType: TaskType) => {
      const task = await apiCreateTask({
        company_id: companyId,
        task_type: taskType,
      });
      await fetchCompanies();
      return task;
    },
    [fetchCompanies],
  );

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return {
    companies,
    loading,
    error,
    addCompany,
    updateCompany,
    deleteCompany,
    createTask,
    refetch: fetchCompanies,
  };
}
