import { redirect } from "next/navigation";
import TodoApp from "@/components/TodoApp";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maxVersion } from "@/lib/sync-server";
import { TODO_ORDER, TODO_SELECT, toTodo } from "@/lib/todo";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [...TODO_ORDER],
    select: { ...TODO_SELECT, version: true },
  });

  return (
    <TodoApp
      email={user.email}
      snapshot={{
        userId: user.id,
        todos: todos.map(toTodo),
        cursor: maxVersion(todos.map((todo) => todo.version)),
        points: user.points,
      }}
      vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null}
    />
  );
}
