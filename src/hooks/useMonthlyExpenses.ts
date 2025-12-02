import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyExpense {
  id: string;
  month: string;
  fan_curier: number;
  sameday: number;
  easysale: number;
  the_marketer: number;
  netopia: number;
  google_ads: number;
  facebook_ads: number;
  employee_costs: number;
}

export function useMonthlyExpenses(month: string) {
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["monthly-expenses", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_expenses")
        .select("*")
        .eq("month", month)
        .maybeSingle();

      if (error) throw error;
      return data as MonthlyExpense | null;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: Omit<MonthlyExpense, "id">) => {
      const { data: existing } = await supabase
        .from("monthly_expenses")
        .select("id")
        .eq("month", values.month)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("monthly_expenses")
          .update(values)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monthly_expenses")
          .insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses", month] });
    },
  });

  return {
    expenses,
    isLoading,
    saveExpenses: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}
