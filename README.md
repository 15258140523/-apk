# 英语学习账本

单家庭英语课程管理应用。服务端为 Go + SQLite；Vue 前端构建后嵌入单一服务二进制。包含一个 Android WebView 壳和 GitHub Actions 的 APK 构建流程。

## 本地运行

一键构建并启动：

```bash
./scripts/build-and-run.sh
```

默认访问地址为 `http://127.0.0.1:8080`。可指定端口或数据目录：

```bash
APP_ADDR=127.0.0.1:8090 APP_DATA_DIR=/path/to/data ./scripts/build-and-run.sh
```

手动执行各步骤：

```bash
pnpm install --prefix web
pnpm run build --prefix web
go mod download
go run ./cmd/server -addr :8080 -data ./data
```

## 一键打包

```bash
./scripts/package-release.sh
```

脚本会在 `release/` 中生成本机系统架构的服务端压缩包、部署文档和 SHA-256 校验文件。APK 只在 GitHub Actions 的 `Build Android APK` 工作流中构建。

由于 SQLite 驱动使用本机 C 编译器，Linux 部署包应在 Linux 主机或同架构 Linux 构建环境中运行此脚本。

Open `http://127.0.0.1:8080`. The first visitor creates the family and first course. For an early self-hosted deployment, identities use the `X-User-ID` request header (default `local-owner`); put the service behind an identity-aware reverse proxy before inviting family members.

## Build one deployable binary

```bash
pnpm ci --prefix web && pnpm run build --prefix web
go build -trimpath -ldflags="-s -w" -o family-english ./cmd/server
./family-english -addr :8080 -data /var/lib/family-english
```

See [the deployment guide](docs/operations/self-hosted-deployment.md) for HTTPS, service management, firewall, backup, the APK workflow, and an external-network checklist.
