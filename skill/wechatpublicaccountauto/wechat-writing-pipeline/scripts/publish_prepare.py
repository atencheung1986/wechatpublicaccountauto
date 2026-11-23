#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
发布准备：把终稿 Markdown 变成「发布脚本能正确吃掉」的形态。

做三件事，对应三个实测踩过的坑：
  1. 剥离 <!-- image:xxx --> 锚点注释 —— 留着会被当成正文首段，顶掉摘要
  2. frontmatter 的 digest 转成 description —— 发布脚本只认 description/summary
  3. 打印可直接复制的发布命令（含 --summary）

用法:
    python3 publish_prepare.py 03-humanized.md [-o publish.md]
    python3 publish_prepare.py 03-humanized.md --dry-run   # 只检查不写文件
"""

import argparse
import os
import re
import sys

ANCHOR_RE = re.compile(r'^[ \t]*<!--\s*image:[^>]*-->[ \t]*\r?\n?', re.M)
FM_RE = re.compile(r'^---\r?\n(.*?)\r?\n---\r?\n?', re.S)
SUMMARY_KEYS = ('description', 'summary', 'digest')


def split_frontmatter(text):
    m = FM_RE.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def get_field(fm, key):
    if fm is None:
        return None
    # 注意用 [ \t] 而不是 \s：\s 会吃掉换行，把空字段和下一行粘到一起
    m = re.search(r'^%s[ \t]*:[ \t]*(.*)$' % re.escape(key), fm, re.M)
    if not m:
        return None
    v = m.group(1).strip().strip('"\'')
    return v or None


def set_field(fm, key, value):
    if fm is None:
        return '%s: %s' % (key, value)
    if re.search(r'^%s[ \t]*:' % re.escape(key), fm, re.M):
        return re.sub(r'^%s[ \t]*:.*$' % re.escape(key),
                      '%s: %s' % (key, value), fm, flags=re.M)
    return fm.rstrip() + '\n%s: %s' % (key, value)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('-o', '--output', default=None)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    src = args.input
    if not os.path.exists(src):
        print('[ERROR] 找不到输入文件: %s' % src)
        return 1
    out = args.output or os.path.join(os.path.dirname(os.path.abspath(src)), 'publish.md')

    raw = open(src, encoding='utf-8').read()
    fm, body = split_frontmatter(raw)

    # 1. 剥离锚点注释
    removed = len(ANCHOR_RE.findall(body))
    clean_body = ANCHOR_RE.sub('', body)

    # 2. frontmatter 摘要字段归位
    summary = None
    for k in SUMMARY_KEYS:
        summary = get_field(fm, k)
        if summary:
            break
    if summary:
        for k in ('digest',):  # 脚本不认的字段：改成 description
            if get_field(fm, k):
                # 连行尾换行一起删，否则会留一行空行在前言里
                fm = re.sub(r'^%s[ \t]*:.*\r?\n?' % re.escape(k), '', fm, flags=re.M)
                fm = fm.rstrip()
        if not get_field(fm, 'description'):
            fm = set_field(fm, 'description', summary)

    fm = re.sub(r'\n{3,}', '\n\n', (fm or '').strip())
    new_text = ('---\n%s\n---\n\n' % fm if fm else '') + clean_body.lstrip('\n')

    title = get_field(fm, 'title') or ''
    author = get_field(fm, 'author') or ''

    print('[prepare] 输入:   %s' % src)
    print('[prepare] 剥离锚点注释: %d 处' % removed)
    print('[prepare] 摘要:   %s' % (summary or '未找到（将退化成正文首段，建议补 description）'))
    print('[prepare] 标题:   %s' % title)

    # 3. 自检：正文首段不能是注释，也不能为空
    first_para = next((l for l in clean_body.strip().split('\n') if l.strip()), '')
    if first_para.startswith('<!--'):
        print('[WARN] 正文首段仍是注释，摘要会出错')
    if len(summary or '') > 120:
        print('[WARN] 摘要超过 120 字，公众号可能被截断')

    if args.dry_run:
        print('[dry-run] 未写入文件')
        return 0

    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_text)
    print('[prepare] 输出:   %s' % out)

    print('\n发布命令（浏览器模式）:')
    cmd = 'bun ~/.workbuddy/skills/baoyu-post-to-wechat/scripts/wechat-article.ts \\\n' \
          '  --markdown "%s" --theme default' % out
    if summary:
        cmd += ' \\\n  --summary "%s"' % summary.replace('"', '\\"')
    if author:
        cmd += ' \\\n  --author "%s"' % author
    cmd += ' --submit'
    print(cmd)
    return 0


if __name__ == '__main__':
    sys.exit(main())
