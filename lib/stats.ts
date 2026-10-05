export const STATS_RANGES = [7, 30, 90] as const;

export type DailyStat = {
  date: string;
  newUsers: number;
  totalUsers: number;
  newTodos: number;
};

export type StatsResponse = {
  totalUsers: number;
  totalTodos: number;
  daily: DailyStat[];
};
