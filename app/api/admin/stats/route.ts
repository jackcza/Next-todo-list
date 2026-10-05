import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { STATS_RANGES, type DailyStat, type StatsResponse } from "@/lib/stats";

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Query: ?days=7|30|90&tz=<IANA time zone>. Days are bucketed in that time zone. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);
  if (user.role !== ADMIN_ROLE) return jsonError("Admin access required.", 403);

  const params = new URL(request.url).searchParams;
  const days = Number(params.get("days"));
  if (!(STATS_RANGES as readonly number[]).includes(days)) return jsonError("Invalid range.", 400);
  const tz = params.get("tz") ?? "UTC";
  if (!isTimeZone(tz)) return jsonError("Invalid time zone.", 400);

  // createdAt columns hold UTC wall-clock times, so convert UTC -> tz before taking the date.
  const rows = await prisma.$queryRaw<{ date: string; users: number; todos: number }[]>`
    WITH days AS (
      SELECT generate_series(
        (now() AT TIME ZONE ${tz})::date - ${days - 1}::int,
        (now() AT TIME ZONE ${tz})::date,
        interval '1 day'
      )::date AS day
    ),
    since AS (SELECT (now() AT TIME ZONE 'UTC') - make_interval(days => ${days + 1}::int) AS at),
    u AS (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})::date AS day, count(*)::int AS n
      FROM "User", since WHERE "createdAt" >= since.at GROUP BY 1
    ),
    t AS (
      SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})::date AS day, count(*)::int AS n
      FROM "Todo", since WHERE "createdAt" >= since.at GROUP BY 1
    )
    SELECT to_char(days.day, 'YYYY-MM-DD') AS date,
           COALESCE(u.n, 0)::int AS users,
           COALESCE(t.n, 0)::int AS todos
    FROM days LEFT JOIN u USING (day) LEFT JOIN t USING (day)
    ORDER BY days.day`;

  const [totalUsers, totalTodos] = await Promise.all([prisma.user.count(), prisma.todo.count()]);

  // Running total of users at the end of each day, counting back from today's total.
  let runningUsers = totalUsers - rows.reduce((sum, row) => sum + row.users, 0);
  const daily: DailyStat[] = rows.map((row) => {
    runningUsers += row.users;
    return { date: row.date, newUsers: row.users, totalUsers: runningUsers, newTodos: row.todos };
  });

  const body: StatsResponse = { totalUsers, totalTodos, daily };
  return Response.json(body);
}
