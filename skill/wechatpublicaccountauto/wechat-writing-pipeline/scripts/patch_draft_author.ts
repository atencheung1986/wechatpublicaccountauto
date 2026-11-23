#!/usr/bin/env bun
/**
 * 给「已经存在的草稿」补作者。
 *
 * 为什么需要：`wechat-article.ts` 只在新建草稿时写作者，历史草稿的作者栏改不了；
 * frontmatter 的 author 为空时它连 --author 都不传，于是草稿箱里作者一栏是空的。
 *
 * 用法:
 *   bun patch_draft_author.ts --appmsgids 100000009,100000013,100000027
 *   bun patch_draft_author.ts --appmsgids 100000027 --author "野生项目经理A总" --dry-run
 *
 * 选项:
 *   --appmsgids <ids>   逗号分隔的草稿 appmsgid（必填）
 *   --author <name>     署名；省略则读 EXTEND.md 的 default_author
 *   --overwrite         作者已有值时也覆盖（默认只填空值，非空则跳过）
 *   --dry-run           只读取当前标题/作者，不填不保存
 *   --cdp-port <port>   连接已开着的调试端口（默认自动探测）
 *
 * 安全边界：只碰 #author 一个输入框，不碰标题和正文；标题读到空值就跳过该篇。
 */
import {
  launchChrome,
  tryConnectExisting,
  findExistingChromeDebugPort,
  getPageSession,
  evaluate,
  sleep,
  type ChromeSession,
  type CdpConnection,
} from '../../baoyu-post-to-wechat/scripts/cdp.ts';
import {
  loadWechatExtendConfig,
  resolveAccount,
} from '../../baoyu-post-to-wechat/scripts/wechat-extend-config.ts';

const WECHAT_URL = 'https://mp.weixin.qq.com/';

interface Args {
  ids: string[];
  author: string;
  cdpPort?: number;
  overwrite: boolean;
  dryRun: boolean;
}

function printUsage(): never {
  console.log(`给已存在的草稿补作者

  bun patch_draft_author.ts --appmsgids 100000009,100000013 [--author "名字"] [--overwrite] [--dry-run]

  --appmsgids  逗号分隔的 appmsgid（必填）
  --author     署名，省略则取 EXTEND.md 的 default_author
  --overwrite  覆盖已有的非空作者（默认跳过）
  --dry-run    只读不写
  --cdp-port   连接已开着的 Chrome 调试端口
`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  let ids: string[] = [];
  let author = '';
  let cdpPort: number | undefined;
  let overwrite = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--appmsgids') ids = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--author') author = argv[++i] || '';
    else if (a === '--overwrite') overwrite = true;
    else if (a === '--dry-run') dryRun = true;
    else if (a === '--cdp-port') cdpPort = Number(argv[++i]);
    else if (a === '-h' || a === '--help') printUsage();
    else printUsage();
  }

  if (!ids.length) printUsage();

  if (!author) {
    const resolved = resolveAccount(loadWechatExtendConfig());
    author = (resolved.default_author || '').trim();
  }
  if (!author) throw new Error('没有署名：传 --author，或先在 EXTEND.md 配 default_author');

  return { ids, author, cdpPort, overwrite, dryRun };
}

/** 等到页面真正进到后台（URL 含 /cgi-bin/），刚启动的 Chrome 首屏慢，不能只看一次 */
async function waitForBackend(session: ChromeSession, timeoutMs = 60_000): Promise<string> {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    last = await evaluate<string>(session, 'window.location.href').catch(() => '');
    if (last.includes('/cgi-bin/')) return last;
    await sleep(1500);
  }
  throw new Error(
    `未进入公众号后台（当前页面：${last || 'unknown'}）。请在弹出的 Chrome 窗口里扫码登录后重跑本脚本`,
  );
}

async function waitForElement(session: ChromeSession, selector: string, timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await evaluate<boolean>(
      session,
      `!!document.querySelector(${JSON.stringify(selector)})`,
    ).catch(() => false);
    if (found) return true;
    await sleep(600);
  }
  return false;
}

interface PageState {
  title: string;
  author: string;
  hasSubmit: boolean;
}

async function readPageState(session: ChromeSession): Promise<PageState> {
  const raw = await evaluate<string>(
    session,
    `(function() {
      const t = document.querySelector('#title');
      const a = document.querySelector('#author');
      const s = document.querySelector('#js_submit button');
      return JSON.stringify({
        title: (t && t.value ? t.value : '').trim(),
        author: (a && a.value ? a.value : '').trim(),
        hasSubmit: !!s
      });
    })()`,
  );
  return JSON.parse(raw || '{}') as PageState;
}

interface SaveStatus {
  isLoading: boolean;
  messages: string[];
}

async function readSaveStatus(session: ChromeSession): Promise<SaveStatus> {
  const raw = await evaluate<string>(
    session,
    `(function() {
      const submit = document.querySelector('#js_submit');
      const btn = submit && submit.querySelector('button');
      const msgs = Array.from(document.querySelectorAll('.weui-desktop-toast, .weui-desktop-toptips, .js_tips'))
        .map(function(e){ return (e.innerText || e.textContent || '').trim(); })
        .filter(Boolean);
      return JSON.stringify({
        isLoading: !!(submit && submit.classList.contains('btn_loading')) || !!(btn && btn.disabled),
        messages: msgs
      });
    })()`,
  );
  return JSON.parse(raw || '{}') as SaveStatus;
}

async function waitForSaveSettled(session: ChromeSession, timeoutMs = 45_000): Promise<void> {
  const start = Date.now();
  let sawLoading = false;
  while (Date.now() - start < timeoutMs) {
    const st = await readSaveStatus(session);
    const fail = st.messages.find((m) => /失败|错误|fail|error/i.test(m));
    if (fail) throw new Error(`保存失败：${fail}`);
    if (st.isLoading) sawLoading = true;
    else if (sawLoading || Date.now() - start > 4000) return;
    await sleep(700);
  }
  throw new Error('保存超时：按钮一直处于 loading，或页面没响应');
}

async function fillAuthor(session: ChromeSession, author: string): Promise<string> {
  const raw = await evaluate<string>(
    session,
    `(function() {
      const el = document.querySelector('#author');
      if (!el) return '__NO_EL__';
      el.focus();
      el.select && el.select();
      el.value = ${JSON.stringify(author)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      return el.value;
    })()`,
  );
  return raw || '';
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[patch] 目标草稿: ${args.ids.join(', ')}`);
  console.log(`[patch] 署名: ${args.author}${args.dryRun ? '（dry-run，不写入）' : ''}`);

  let cdp: CdpConnection;
  let launched = false;

  const portToTry = args.cdpPort ?? (await findExistingChromeDebugPort());
  if (portToTry) {
    const existing = await tryConnectExisting(portToTry);
    if (existing) {
      console.log(`[cdp] 复用已开的 Chrome，端口 ${portToTry}`);
      cdp = existing;
    } else {
      const l = await launchChrome(WECHAT_URL);
      cdp = l.cdp;
      launched = true;
    }
  } else {
    const l = await launchChrome(WECHAT_URL);
    cdp = l.cdp;
    launched = true;
  }

  const results: Array<{ id: string; title: string; before: string; after: string; status: string }> = [];

  try {
    await sleep(3000);
    const session = await getPageSession(cdp, 'mp.weixin.qq.com');

    const href = await waitForBackend(session);
    console.log('[patch] 已进入后台');
    const token = await evaluate<string>(
      session,
      `new URLSearchParams(location.search).get('token') || ''`,
    );
    if (!token) throw new Error('URL 里取不到 token，请在公众号后台首页状态下重跑');

    for (const id of args.ids) {
      const editUrl =
        `${WECHAT_URL}cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77` +
        `&appmsgid=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}&lang=zh_CN`;
      console.log(`\n[patch] ---- ${id} ----`);
      console.log('[patch] 打开编辑页...');
      await evaluate(session, `window.location.href = ${JSON.stringify(editUrl)}`);
      await sleep(2500);

      const ok = await waitForElement(session, '#author', 30_000);
      if (!ok) throw new Error(`草稿 ${id} 编辑页没等到 #author，可能未加载完或无权访问`);
      await sleep(1200);

      const st = await readPageState(session);
      if (!st.title) {
        results.push({ id, title: '', before: st.author, after: '', status: '跳过：标题为空，页面可能没加载好' });
        console.log('[patch] 跳过：标题为空');
        continue;
      }
      console.log(`[patch] 标题: ${st.title}`);
      console.log(`[patch] 当前作者: ${st.author || '(空)'}`);

      if (st.author && !args.overwrite) {
        results.push({ id, title: st.title, before: st.author, after: st.author, status: '跳过：已有作者' });
        console.log('[patch] 跳过：已有作者（要覆盖加 --overwrite）');
        continue;
      }
      if (st.author === args.author && !args.overwrite) {
        results.push({ id, title: st.title, before: st.author, after: st.author, status: '已是目标署名' });
        console.log('[patch] 已是目标署名，无需改动');
        continue;
      }

      if (args.dryRun) {
        results.push({ id, title: st.title, before: st.author, after: args.author, status: 'dry-run 未写入' });
        continue;
      }

      const actual = await fillAuthor(session, args.author);
      if (actual !== args.author) {
        results.push({ id, title: st.title, before: st.author, after: actual, status: '失败：输入框没接受该值' });
        console.log(`[patch] 失败：作者框值是 "${actual}"`);
        continue;
      }
      console.log('[patch] 作者已填，保存中...');

      await evaluate(session, `document.querySelector('#js_submit button').click()`);
      try {
        await waitForSaveSettled(session);
      } catch (e) {
        results.push({ id, title: st.title, before: st.author, after: args.author, status: `失败：${(e as Error).message}` });
        console.log(`[patch] ${(e as Error).message}`);
        continue;
      }

      const after = await readPageState(session);
      const saved = after.author === args.author;
      results.push({
        id,
        title: st.title,
        before: st.author,
        after: after.author,
        status: saved ? '已保存' : '保存后回读不一致，请人工核对',
      });
      console.log(`[patch] ${saved ? '已保存' : '回读不一致，请人工核对'}`);
      await sleep(1200);
    }
  } finally {
    cdp.close();
  }

  console.log('\n[patch] ===== 汇总 =====');
  for (const r of results) {
    console.log(`[patch] ${r.id} | ${r.status} | 作者: ${r.before || '(空)'} → ${r.after || '(空)'} | ${r.title || '(无标题)'}`);
  }
  const bad = results.filter((r) => r.status.startsWith('失败'));
  if (bad.length) {
    console.log(`[patch] ${bad.length} 篇失败`);
    process.exit(1);
  }
  if (launched) console.log('[patch] 浏览器窗口保留（未关闭），方便人工复核');
  // CDP 的 WebSocket / Chrome 子进程句柄会让 bun 事件循环一直活着，必须显式退出。
  // 用 exitCode + exit 让失败用例仍返回非 0。
  process.exit(process.exitCode ?? 0);
}

await main();
