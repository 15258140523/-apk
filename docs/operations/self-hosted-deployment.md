# 闲置主机外网部署与安卓发布

本指南以一台 Linux 主机和一个域名为例。应用只监听本机 `127.0.0.1:8080`，由 Caddy 负责公网 HTTPS。不要直接将 SQLite 服务端口暴露到互联网。

## 1. 准备公网入口

1. 准备一个可解析到主机公网 IP 的域名，例如 `english.example.com`。如果主机在家庭宽带后，路由器将公网 TCP 80、443 转发到此主机；没有公网 IPv4 时，使用带固定入口的反向隧道或云主机，不能仅靠内网 IP。
2. 放行主机防火墙的 TCP 80、443。不要放行 8080。
3. 在 DNS 控制台添加 `A` 记录：`english.example.com -> 公网 IP`。等待 `dig +short english.example.com` 返回该 IP。

## 2. 部署二进制

在部署主机或同 CPU 架构的 Linux 构建环境中运行 `./scripts/package-release.sh`，然后将 `release/` 下生成的压缩包解压。以下命令假设已进入解压后的目录。

```bash
sudo useradd --system --home /var/lib/family-english --shell /usr/sbin/nologin familyenglish
sudo install -d -o familyenglish -g familyenglish /opt/family-english /var/lib/family-english
sudo install -o root -g root -m 0755 family-english /opt/family-english/family-english
```

创建 `/etc/systemd/system/family-english.service`：

```ini
[Unit]
Description=Family English App
After=network-online.target
Wants=network-online.target

[Service]
User=familyenglish
Group=familyenglish
WorkingDirectory=/var/lib/family-english
ExecStart=/opt/family-english/family-english -addr 127.0.0.1:8080 -data /var/lib/family-english
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/family-english

[Install]
WantedBy=multi-user.target
```

启动并检查：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now family-english
curl http://127.0.0.1:8080/api/health
sudo journalctl -u family-english -f
```

## 3. 配置 HTTPS

安装 Caddy（按 [Caddy 官方安装说明](https://caddyserver.com/docs/install) 选择你的发行版），创建 `/etc/caddy/Caddyfile`：

```caddyfile
english.example.com {
  reverse_proxy 127.0.0.1:8080
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
```

```bash
sudo systemctl reload caddy
curl -I https://english.example.com/api/health
```

Caddy 会自动申请并续期证书。若证书申请失败，先检查 DNS、80/443 转发、防火墙，以及域名没有被其他代理占用。

## 4. 身份与家庭访问

当前 MVP 为了离线可部署性，以反向代理写入的 `X-User-ID` 区分成员。上线前必须在 Caddy 前接入认证层，并确保用户无法自行伪造该请求头。可选方案是 Authelia、Authentik、Cloudflare Access，或自建登录网关；网关应在认证后覆盖 `X-User-ID`，并删除外部传入的同名头。完成后，家庭成员用不同账号首次登录，再由创建者在数据库管理页授予角色。

未接入可信认证前，不要把此应用放在公网给多人使用，因为伪造请求头可冒充成员。

## 5. 备份与升级

SQLite 使用 WAL 模式，备份时先执行一致性快照：

```bash
sudo systemctl stop family-english
sudo tar -C /var/lib -czf /var/backups/family-english-$(date +%F).tgz family-english
sudo systemctl start family-english
```

每日定时备份到另一块磁盘或加密对象存储，并至少每月验证一次可恢复性。升级时保留 `data/`，替换 `/opt/family-english/family-english` 后执行 `sudo systemctl restart family-english`。

## 6. 构建 APK

1. 在 GitHub 仓库 **Settings > Secrets and variables > Actions > Variables** 添加 `SERVICE_URL=https://english.example.com/`。
2. 打 `v1.0.0` 形式的 tag 或手动运行 **Build Android APK** 工作流。
3. 下载 `family-english-android-apk`。该工作流产出未签名 APK，准备分发前在 CI 中配置 Android keystore 并加入签名步骤。
4. 真机安装后确认页面为 HTTPS、首页可读、课程能创建、外部网盘链接会打开系统浏览器。

## 外网验收清单

- 使用手机蜂窝网络访问 `https://english.example.com/api/health`，返回 `{"status":"ok"}`。
- 浏览器访问域名，首次可创建家庭、课程和学习记录。
- 路由器重启后 DDNS 或域名仍指向正确公网地址。
- 主机重启后 `systemctl is-active family-english` 为 `active`。
- 已验证备份可解压，且数据库文件不为空。
- 安卓壳配置的是相同 HTTPS 域名，不使用 IP 地址或 HTTP。
