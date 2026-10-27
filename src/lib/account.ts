import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentEnd, diffDays } from "@/lib/billing";

export const TRIAL_DAYS = 7;
export const PRICE_LABEL = "R$ 15/mês";

export type Account = {
  trial_ends_on: string;
  paid_until: string | null;
  billing_day: number | null;
  blocked: boolean;
  onboarded: boolean;
  today: string; // data de hoje no servidor (horário de Brasília)
};

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async (): Promise<Account | null> => {
      const { data, error } = await supabase.rpc("get_my_account" as never);
      if (error) throw error;
      return (data as unknown as Account | null) ?? null;
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin" as never);
      if (error) return false;
      return data === true;
    },
  });
}

export function accessInfo(account: Account | null | undefined) {
  if (!account) {
    return {
      ready: false, blocked: false, subscribed: false, trialActive: false, dueToday: false,
      expired: false, daysLeft: 0, endDate: "", hasAccess: false,
    };
  }
  const endDate = currentEnd(account);
  const daysLeft = Math.max(0, diffDays(endDate, account.today));
  const withinPeriod = account.today <= endDate;
  const subscribed = !!account.paid_until && account.today <= account.paid_until;
  return {
    ready: true,
    blocked: account.blocked,
    subscribed,
    trialActive: !subscribed && account.today <= account.trial_ends_on,
    dueToday: withinPeriod && daysLeft === 0,
    expired: !withinPeriod,
    daysLeft,
    endDate,
    hasAccess: !account.blocked && withinPeriod,
  };
}
