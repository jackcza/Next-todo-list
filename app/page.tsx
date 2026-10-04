import { redirect } from "next/navigation";
import TodoApp from "@/components/TodoApp";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TODO_ORDER, TODO_SELECT } from "@/lib/todo";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [...TODO_ORDER],
    select: TODO_SELECT,
  });

  return <TodoApp email={user.email} initialTodos={todos} />;
}
