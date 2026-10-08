"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { App, Button, Card, Segmented, Statistic } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/components/I18nProvider";
import LanguageSwitch from "@/components/LanguageSwitch";
import { ApiError, errorMessage, requestJson } from "@/lib/api-client";
import { DAYJS_LOCALE } from "@/lib/date";
import { translateServerError } from "@/lib/i18n";
import { STATS_RANGES, type StatsResponse } from "@/lib/stats";

const PRIMARY = "#6366f1";
const ACCENT = "#a855f7";
const CHART_HEIGHT = 280;

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { t, locale } = useI18n();
  const formatTick = (date: string) => dayjs(date).locale(DAYJS_LOCALE[locale]).format(t.admin.tick);
  const formatLabel = (date: unknown) => dayjs(String(date)).locale(DAYJS_LOCALE[locale]).format(t.admin.label);
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<{ days: number; data: StatsResponse } | null>(null);
  const loading = stats?.days !== days;

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    requestJson<StatsResponse>(`/api/admin/stats?days=${days}&tz=${encodeURIComponent(tz)}`)
      .then((data) => {
        if (!cancelled) setStats({ days, data });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          router.replace("/admin/login");
          return;
        }
        message.error(translateServerError(errorMessage(error), locale));
      });
    return () => {
      cancelled = true;
    };
  }, [days, router, message, locale]);

  const logout = async () => {
    await requestJson("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  };

  const data = stats?.data;
  const daily = data?.daily ?? [];
  const newUsers = daily.reduce((sum, day) => sum + day.newUsers, 0);
  const newTodos = daily.reduce((sum, day) => sum + day.newTodos, 0);

  return (
    <div className="admin-app">
      <LanguageSwitch />
      <header className="admin-header">
        <div>
          <h2 className="todo-app-title">{t.admin.title}</h2>
          <p className="todo-app-subtitle">{t.admin.subtitle}</p>
        </div>
        <div className="todo-app-account">
          <span>{email}</span>
          <Link href="/" className="admin-app-link">
            {t.admin.todoApp}
          </Link>
          <Button size="small" type="text" icon={<LogoutOutlined />} onClick={logout}>
            {t.common.logOut}
          </Button>
        </div>
      </header>

      <Segmented<number>
        className="admin-range"
        options={STATS_RANGES.map((value) => ({ label: t.admin.lastDays(value), value }))}
        value={days}
        onChange={setDays}
      />

      <div className="admin-stats">
        <Card size="small" loading={!data}>
          <Statistic title={t.admin.totalUsers} value={data?.totalUsers} />
        </Card>
        <Card size="small" loading={loading}>
          <Statistic title={t.admin.newUsersIn(days)} value={newUsers} />
        </Card>
        <Card size="small" loading={!data}>
          <Statistic title={t.admin.totalTasks} value={data?.totalTodos} />
        </Card>
        <Card size="small" loading={loading}>
          <Statistic title={t.admin.tasksAddedIn(days)} value={newTodos} />
        </Card>
      </div>

      <Card className="admin-chart" title={t.admin.userGrowth} loading={loading}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatTick} minTickGap={16} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="new" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="total" orientation="right" allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={formatLabel} />
            <Legend />
            <Bar yAxisId="new" dataKey="newUsers" name={t.admin.newUsers} fill={PRIMARY} radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="total"
              dataKey="totalUsers"
              name={t.admin.totalUsers}
              stroke={ACCENT}
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card className="admin-chart" title={t.admin.tasksPerDay} loading={loading}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatTick} minTickGap={16} tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={formatLabel} />
            <Bar dataKey="newTodos" name={t.admin.tasksAdded} fill={PRIMARY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
