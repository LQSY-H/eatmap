#!/usr/bin/env node
/**
 * 创建（或重置）第一个超级管理员账号。
 *
 * 仓库不预置任何管理员/演示账号；部署完成后请执行一次本脚本：
 *
 *   # 方式一：交互式输入（推荐，密码不会进入 shell 历史）
 *   npm run admin:create
 *
 *   # 方式二：环境变量（适合自动化部署；注意不要写进 git）
 *   EATMAP_ADMIN_USERNAME=admin \
 *   EATMAP_ADMIN_NICKNAME=管理员 \
 *   EATMAP_ADMIN_PASSWORD='至少8位密码' \
 *   npm run admin:create -- --reset
 *
 * 参数：
 *   --reset   登录名已存在时，重置其密码并确保角色为 super_admin
 *
 * 说明：
 * - 密码使用项目同款 scrypt 格式写入 data/users.json，不存明文。
 * - 超级管理员可在后台把其他已注册用户提升为 admin（管理员）。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.EATMAP_DATA_DIR?.trim()
  ? path.resolve(process.env.EATMAP_DATA_DIR.trim())
  : path.join(repoRoot, "data");
const usersFile = path.join(dataDir, "users.json");

const args = new Set(process.argv.slice(2));

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function fail(msg) {
  console.error(`[eatmap] ${msg}`);
  process.exit(1);
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const original = rl._writeToOutput;
    rl._writeToOutput = function (str) {
      if (str.includes("\n")) original.call(rl, "\n");
    };
    rl.question(question, (answer) => {
      rl._writeToOutput = original;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  let username = process.env.EATMAP_ADMIN_USERNAME?.trim() ?? "";
  let nickname = process.env.EATMAP_ADMIN_NICKNAME?.trim() ?? "";
  let password = process.env.EATMAP_ADMIN_PASSWORD ?? "";

  if (!username && process.stdin.isTTY) {
    username = (await promptHidden("管理员登录名（英文/数字，用于登录）: ")).trim();
  }
  if (!nickname && process.stdin.isTTY) {
    const input = (await promptHidden(`管理员昵称（展示名，直接回车用「${username}」）: `)).trim();
    if (input) nickname = input;
  }
  if (!password && process.stdin.isTTY) {
    password = await promptHidden("管理员密码（输入不回显，至少 8 位）: ");
    const again = await promptHidden("再次输入密码: ");
    if (password !== again) fail("两次输入的密码不一致。");
  }

  if (!username) fail("缺少登录名：请设置 EATMAP_ADMIN_USERNAME 或在终端交互输入。");
  if (!/^[A-Za-z0-9_.@-]{2,64}$/.test(username)) {
    fail("登录名只能包含字母、数字、下划线、点、@、短横线，长度 2–64。");
  }
  if (!password) fail("缺少密码：请设置 EATMAP_ADMIN_PASSWORD 或在终端交互输入。");
  if (password.length < 8) fail("管理员密码至少 8 位。");
  if (!nickname) nickname = username;
  if (nickname.length > 24) fail("昵称请控制在 24 个字符以内。");

  fs.mkdirSync(dataDir, { recursive: true });
  let users = [];
  if (fs.existsSync(usersFile)) {
    const raw = fs.readFileSync(usersFile, "utf-8").trim();
    users = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users)) fail("data/users.json 格式不是数组，请先修复。");
  }

  const existing = users.find(
    (u) => u.username === username || u.nickname === nickname || u.id === `admin-${username}`,
  );

  if (existing) {
    if (!args.has("--reset")) {
      fail(`登录名/昵称「${username}」已存在。如需重置密码，请加 --reset 参数重新执行。`);
    }
    existing.username = username;
    existing.nickname = nickname;
    existing.role = "super_admin";
    existing.passwordHash = hashPassword(password);
    existing.email = existing.email ?? null;
    existing.phone = existing.phone ?? null;
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");
    console.log(`[eatmap] 已重置超级管理员：${username}（${nickname}）`);
    console.log(`[eatmap] 数据文件：${usersFile}`);
    return;
  }

  if (users.some((u) => u.nickname === nickname)) {
    fail(`昵称「${nickname}」已被其他账号占用，请换一个昵称。`);
  }

  const record = {
    id: `admin-${username}`,
    nickname,
    role: "super_admin",
    email: null,
    phone: null,
    username,
    passwordHash: hashPassword(password),
  };
  users.push(record);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");

  console.log(`[eatmap] 已创建超级管理员：${username}（${nickname}）`);
  console.log(`[eatmap] 数据文件：${usersFile}`);
  console.log("[eatmap] 请妥善保管密码；忘记时可用 --reset 重新执行本脚本。");
}

main().catch((e) => {
  console.error("[eatmap] 创建管理员失败：", e);
  process.exit(1);
});
