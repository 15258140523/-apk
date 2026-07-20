# uniCloud 免费服务空间运维手册

## 1. 创建并绑定阿里云 uniCloud 免费服务空间

1. 登录 [uniCloud 控制台](https://unicloud.dcloud.net.cn/)。
2. 选择"阿里云"区域，创建免费服务空间。
3. 记录 Space ID 和 Space Secret。
4. 在 HBuilderX 中绑定该服务空间到项目。

## 2. 导入 uni-id-pages 和 uni-open-bridge

1. 在 HBuilderX 插件市场导入 `uni-id-pages` 和 `uni-open-bridge`。
2. 将 `uni-id-co` 和 `uni-open-bridge` 云函数放置在 `uniCloud-aliyun/cloudfunctions/` 下。
3. 上传所有公共模块。

## 3. 配置 AppID/Secret

1. 在 `uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json` 中填入微信 AppID 和 Secret。
2. 确认该文件已在 `.gitignore` 中，不会提交到代码仓库。
3. 重新上传 `uni-id-co` 云函数使配置生效。

## 4. 上传数据库 Schema 和索引

1. 在 HBuilderX 中右键 `database` 目录 → "上传所有 Schema 及扩展校验函数"。
2. 确认所有 13 个集合已创建。
3. 在 uniCloud 控制台的数据库管理中验证索引是否正确建立。

## 5. 上传公共模块、云对象和定时触发器

1. 右键 `cloudfunctions/common/app-shared` → "上传公共模块"。
2. 逐个右键每个云对象目录（`family`、`course`、`lesson`、`reminder`、`learning`、`data-export`）→ "上传并运行"。
3. 右键 `reminder-dispatch` → "上传并运行"，确认定时触发器已注册（每 10 分钟）。
4. 右键 `maintenance` → "上传并运行"，确认定时触发器已注册（每天凌晨 3:15）。

## 6. 配置微信订阅消息模板

1. 在微信公众平台 → 订阅消息中申请模板。
2. 记录模板 ID。
3. 在 `reminder` 云对象或小程序端配置中填入模板 ID。
4. 确保用户点击按钮触发 `uni.requestSubscribeMessage`。

## 7. 设置配额告警

1. 在 uniCloud 控制台 → 服务空间 → 云存储中查看用量。
2. 建议在用量达到 80% 时手动检查或配置告警通知。
3. 代码中已实现 80% 警告、95% 阻断上传的逻辑。

## 8. 免费服务空间续期

1. uniCloud 免费空间需要每月续期，否则将被回收。
2. 设置日历提醒：每月 20 日前在控制台续期。
3. 系统会在到期前 7、3、1 天通过 `maintenance` 定时任务提醒创建者。

## 9. 数据导出与恢复

1. 创建者在"家庭"页面点击"导出数据"。
2. 导出为 JSON，包含所有课程、课表、课程实例、学习记录、操作日志。
3. 导出结果 10 分钟后自动过期。
4. 如需恢复数据，需手动通过 uniCloud 控制台导入。

## 10. 云对象回滚

1. 在 HBuilderX 中查看云对象的历史版本。
2. 右键目标云对象 → "回滚"到指定版本。
3. 或者从 Git 仓库 checkout 到指定 tag，重新上传。

## 故障排查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 登录失败 | AppID/Secret 配置错误 | 检查 uni-id 配置文件 |
| 扣课返回 AUTH_REQUIRED | Token 过期 | 小程序端重新登录 |
| 提醒不触发 | 定时器未上传 | 检查 reminder-dispatch 触发器状态 |
| 上传文件失败 | 配额达到 95% | 清理旧文件或导出后删除 |
| 数据查询慢 | 缺少索引 | 在控制台检查并补充索引 |
