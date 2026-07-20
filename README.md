# 英语学习账本

单家庭英语课程管理应用。服务端为 Go + SQLite；Vue 前端构建后嵌入单一服务二进制。包含一个 Android WebView 壳和 GitHub Actions 的服务端/APK 构建流程。

## 本地运行

```bash
npm install --prefix web
npm run build --prefix web
go mod download
go run ./cmd/server -addr :8080 -data ./data
```

Open `http://127.0.0.1:8080`. The first visitor creates the family and first course. For an early self-hosted deployment, identities use the `X-User-ID` request header (default `local-owner`); put the service behind an identity-aware reverse proxy before inviting family members.

## Build one deployable binary

```bash
npm ci --prefix web && npm run build --prefix web
go build -trimpath -ldflags="-s -w" -o family-english ./cmd/server
./family-english -addr :8080 -data /var/lib/family-english
```

See [the deployment guide](docs/operations/self-hosted-deployment.md) for HTTPS, service management, firewall, backup, the APK workflow, and an external-network checklist.
