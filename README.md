# Todo List

一个支持邮箱注册、按日期分组、拖拽排序、段位成长和中英文切换的待办清单应用，可以安装到手机主屏幕使用。

A todo list app with email sign-up, tasks grouped by date, drag-to-reorder, a rank system and a Chinese/English switch. It can be installed to your phone's home screen.

---

## 功能 / Features

- **账号**：邮箱验证码注册、登录、找回密码，登录状态保持 30 天。
  **Accounts**: sign up with an email verification code, log in, reset your password; sessions last 30 days.
- **按日期管理任务**：任务按天分组，今天在最上面；其他日期默认折叠，可以把任务移到任意日期。
  **Tasks by date**: tasks are grouped by day with today on top; other days are collapsed, and any task can be moved to another date.
- **三种状态**：进行中、已完成、已删除，每条任务都会显示添加、完成、删除的时间。
  **Three states**: active, done and deleted, with the time each task was added, completed or deleted.
- **拖拽排序**：电脑上按住拖动，手机上长按约 0.2 秒后拖动，可调整同一天内的顺序。
  **Drag to reorder**: drag with the mouse, or long-press for about 0.2 s on a phone, to reorder tasks within a day.
- **彩虹标记**：每天的任务按顺序用红、橙、黄、绿、蓝、靛、紫的小圆点标记。
  **Rainbow dots**: tasks in each day are marked red, orange, yellow, green, blue, indigo, violet in order.
- **完成奖励**：标记完成时会爆出金币动画，并累积段位积分。
  **Rewards**: marking a task done bursts gold coins and earns rank points.
- **中英文切换**：默认跟随浏览器语言，可以在卡片右上角切换，选择会被记住。
  **Chinese / English**: follows the browser language by default; switch in the card's top-right corner and the choice is remembered.
- **PWA**：可以安装到手机或电脑，离线时显示提示页。
  **PWA**: installable on phones and desktops, with an offline page.
- **管理后台**：管理员可以查看用户增长和每日新增任务的图表。
  **Admin dashboard**: admins can see charts of user growth and tasks added per day.

---

## 使用说明 / How to use

### 1. 注册和登录 / Sign up and log in

打开应用后点「注册」，输入邮箱并点「发送验证码」，填入邮件里的 6 位验证码，设置密码即可。忘记密码时在登录页点「忘记密码？」，用同样的方式重置。

Open the app and choose **Sign up**. Enter your email, tap **Send code**, type the 6-digit code from the email and set a password. If you forget it, tap **Forgot password?** on the login page and reset it the same way.

### 2. 添加和管理任务 / Add and manage tasks

- 在输入框写下任务，按回车或点「添加」，任务会归到今天。
  Type a task and press Enter or tap **Add**; it goes under today.
- 每条任务右侧有三个按钮：📅 移到其他日期、✓ 标记完成、🗑 删除。
  Each task has three buttons on the right: 📅 move to another date, ✓ mark as done, 🗑 delete.
- 在「已完成」里点 ↩ 可以改回进行中；在「已删除」里点 ↩ 可以恢复。
  Tap ↩ in **Done** to make a task active again, or in **Deleted** to restore it.
- 今天以外的日期默认收起，点日期标题展开。
  Days other than today are collapsed; tap the day header to expand.
- 按住任务拖动可以调整同一天里的顺序。
  Press and drag a task to reorder it within the same day.

### 3. 段位规则 / Rank rules

每完成一个任务得 10 分，每 50 分（5 个任务）得 1 颗星。撤销完成会扣回分数，删除已完成的任务不扣分。

Each completed task is worth 10 points, and every 50 points (5 tasks) earns a star. Undoing a completed task takes the points back; deleting a completed task keeps them.

| 段位 / Tier | 小段 / Divisions | 每段星数 / Stars each |
| --- | --- | --- |
| 倔强青铜 / Bronze | III – I | 3 |
| 秩序白银 / Silver | III – I | 3 |
| 荣耀黄金 / Gold | IV – I | 4 |
| 尊贵铂金 / Platinum | IV – I | 4 |
| 永恒钻石 / Diamond | V – I | 5 |
| 至尊星耀 / Starshine | V – I | 5 |

满 100 颗星进入王者，之后按王者星数获得称号：

After 100 stars you reach King, and earn titles by your King stars:

| 称号 / Title | 王者星数 / King stars |
| --- | --- |
| 最强王者 / Supreme King | 0 – 9 |
| 非凡王者 / Extraordinary King | 10 – 19 |
| 无双王者 / Peerless King | 20 – 29 |
| 绝世王者 / Unrivaled King | 30 – 39 |
| 至圣王者 / Sacred King | 40 – 49 |
| 荣耀王者 / Glorious King | 50 – 99 |
| 传奇王者 / Legendary King | 100+ |

### 4. 安装到主屏幕 / Add to home screen

- **iPhone（Safari）**：点底部的分享按钮，选择「添加到主屏幕」。
  **iPhone (Safari)**: tap the Share button and choose **Add to Home Screen**.
- **Android（Chrome）**：点右上角 ⋮，选择「安装应用」，或点应用顶部的「安装应用」按钮。
  **Android (Chrome)**: tap ⋮ in the top-right and choose **Install app**, or use the **Install app** button in the app.
- **电脑（Chrome / Edge）**：点地址栏右侧的安装图标。
  **Desktop (Chrome / Edge)**: click the install icon in the address bar.

应用顶部的「使用说明」按钮会打开带动画演示的说明页（`/guide.html`），不登录也能访问。

The **Guide** button at the top opens an animated walkthrough (`/guide.html`), which works without logging in.

---

## 技术栈 / Tech stack

| 用途 / Purpose | 技术 / Technology |
| --- | --- |
| 框架 / Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| 界面 / UI | Ant Design 6, @ant-design/icons |
| 拖拽 / Drag and drop | @dnd-kit/core, @dnd-kit/sortable |
| 图表 / Charts | Recharts |
| 日期 / Dates | Day.js |
| 数据库 / Database | PostgreSQL (Neon), Prisma 7 with `@prisma/adapter-pg` |
| 认证 / Auth | 自建会话 Cookie + bcryptjs 密码哈希 / Session cookies with bcryptjs password hashing |
| 邮件 / Email | Nodemailer + Brevo SMTP |
| 部署 / Hosting | Vercel |

---

## 本地运行 / Run locally

### 1. 准备 / Prerequisites

- Node.js 20 或更高版本 / Node.js 20 or later
- 一个 PostgreSQL 数据库，例如 [Neon](https://neon.tech) 的免费套餐 / A PostgreSQL database, for example a free [Neon](https://neon.tech) project
- （可选）一个 SMTP 账号，例如 [Brevo](https://www.brevo.com) / (Optional) An SMTP account such as [Brevo](https://www.brevo.com)

### 2. 安装依赖 / Install dependencies

```bash
git clone https://github.com/jackcza/Next-todo-list.git
cd Next-todo-list
npm install
```

`npm install` 完成后会自动运行 `prisma generate` 生成数据库客户端。

`npm install` runs `prisma generate` afterwards to build the database client.

### 3. 配置环境变量 / Configure environment variables

在项目根目录创建 `.env` 文件。这个文件包含密钥，已被 `.gitignore` 忽略，不要提交到 Git。

Create a `.env` file in the project root. It holds secrets and is ignored by `.gitignore`; never commit it.

```bash
# 应用使用的连接池地址（Neon 中带 -pooler 的主机）
# Pooled connection used by the app (the -pooler host on Neon)
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler/DB?sslmode=require"
# 数据库迁移使用的直连地址（不带 -pooler）
# Direct connection used by migrations (without -pooler)
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

# 发送验证码的 SMTP 配置 / SMTP settings for verification emails
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-login"
SMTP_PASS="your-smtp-key"
# 必须是在 Brevo 中验证过的发件地址 / Must be a sender verified in Brevo
MAIL_FROM="you@example.com"
```

不配置 SMTP 时，验证码不会发邮件，而是打印在运行 `npm run dev` 的终端里，方便本地测试。

Without SMTP settings, codes are printed to the terminal running `npm run dev` instead of being emailed, which is handy for local testing.

### 4. 初始化数据库 / Set up the database

```bash
npx prisma migrate deploy
```

### 5. 启动 / Start

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，注册一个账号就可以开始使用。

Open [http://localhost:3000](http://localhost:3000) and sign up to start.

---

## 管理后台 / Admin dashboard

先在应用里注册一个账号，然后把它设为管理员：

Sign up in the app first, then make the account an admin:

```bash
npm run admin:grant -- you@example.com
# 取消管理员 / Remove admin access
npm run admin:revoke -- you@example.com
```

之后访问 `/admin/login` 登录后台，可以查看最近 7 / 30 / 90 天的用户增长和每日新增任务。

Then log in at `/admin/login` to see user growth and tasks added per day for the last 7, 30 or 90 days.

---

## 常用命令 / Scripts

| 命令 / Command | 说明 / Description |
| --- | --- |
| `npm run dev` | 启动开发服务器 / Start the dev server |
| `npm run build` | 生产环境构建 / Build for production |
| `npm run start` | 运行构建后的应用 / Run the production build |
| `npm run lint` | 代码检查 / Lint the code |
| `npm run admin:grant -- <email>` | 设为管理员 / Grant admin access |
| `npm run admin:revoke -- <email>` | 取消管理员 / Revoke admin access |

---

## 部署 / Deployment

推荐部署到 [Vercel](https://vercel.com)：

We recommend [Vercel](https://vercel.com):

1. 把代码推到 GitHub，在 Vercel 中导入这个仓库。
   Push the code to GitHub and import the repository in Vercel.
2. 在 Vercel 项目的 Settings → Environment Variables 中填入和 `.env` 相同的变量。
   Add the same variables as in `.env` under the project's Settings → Environment Variables.
3. 部署前在本地运行 `npx prisma migrate deploy`，确保数据库结构是最新的。
   Run `npx prisma migrate deploy` locally before deploying so the database schema is up to date.

之后每次推送到 GitHub，Vercel 都会自动构建并发布。

After that, every push to GitHub is built and deployed automatically.

---

## 目录结构 / Project structure

```text
app/                 页面与 API 路由 / Pages and API routes
  api/               认证、任务、管理后台接口 / Auth, task and admin endpoints
  admin/             管理后台页面 / Admin pages
  login/ register/ forgot-password/   账号相关页面 / Account pages
components/          React 组件 / React components
lib/                 认证、数据库、日期、段位、多语言等 / Auth, database, dates, ranks, i18n
prisma/              数据库模型和迁移 / Database schema and migrations
public/              图标、Service Worker、离线页、使用说明页 / Icons, service worker, offline and guide pages
scripts/             管理员和图标生成脚本 / Admin and icon scripts
proxy.ts             未登录时跳转到登录页 / Redirects signed-out visitors to the login page
```
