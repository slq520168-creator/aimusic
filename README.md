# AI Music

GlobalYouXuan 的独立 AI 音乐前台与审核后台。仓库只负责静态页面和浏览器端业务编排；身份、积分、曲库、审核、歌词生成和音频生成通过 Supabase 提供。

## 当前功能

- 公共曲库：读取已审核歌曲、在线播放、上一首/下一首、下载。
- 游客积分：游客身份、上传/下载奖励、每日积分上限、注册后合并到正式会员。
- 普通上传：音频上传到 Supabase Storage，再通过 Edge Function 登记为 `pending` 待审核。
- AI 写歌：生成歌词、人声完整歌曲、纯音乐，生成后可保存到待审核。
- 管理后台：管理员登录、待审核/已通过/已拒绝列表、通过/拒绝/退回待审核、管理员直接上传并发布。

## 文件结构

- `index.html`：公共前台、曲库、播放器、积分入口与上传 UI。
- `ai-song.js`：唯一的上传提交逻辑和 AI 写歌逻辑。`index.html` 不再重复实现上传提交。
- `admin.html`：审核后台。
- `config.js`：前端唯一运行时配置，集中保存 Supabase URL、publishable key、Storage bucket、主站地址和函数名称。

## Supabase 依赖

### Storage

- bucket：`aimusic-audio`

### 数据

前端依赖至少以下业务对象：

- `aimusic_tracks`：歌曲元数据与审核状态。
- `aimusic_guest_accounts`：游客身份与积分关联。
- `aimusic_record_play`：播放计数 RPC。

具体表结构、RLS 与管理员权限以 Supabase 项目中的生产配置为准。

### Edge Functions

- `aimusic-guest-points`：游客身份、状态、积分奖励。
- `aimusic-submit-track`：统一登记普通上传/AI 生成歌曲为待审核。
- `aimusic-lyrics`：AI 歌词生成。
- `aimusic-vocal-generate`：人声歌曲服务器生成入口。
- `aimusic-generate-audio`：纯音乐生成入口。
- `aimusic-admin`：管理员审核操作。
- `aimusic-admin-upload`：管理员直接上传并发布。

## 生成通道规则

浏览器端不再直接连接 ACE-Step 或 DiffRhythm 的公开 Gradio Space，也不再在前端做公开节点级联回退。公开 Gradio 节点会睡眠、排队、限额、改 endpoint 或要求认证，不适合作为稳定生产链。

前端现在只调用服务器入口：

- 人声：`aimusic-vocal-generate`
- 纯音乐：`aimusic-generate-audio`

ACE-Step / DiffRhythm 如果继续使用，应放在服务器端，并改为自建实例或受控、稳定的 API。任何 `HF_TOKEN`、Stability key 或其他私密密钥都只能保存在服务器/Supabase Secret 中，禁止写入本仓库或浏览器代码。

## 前端配置

统一修改 `config.js`，不要再在 `index.html`、`ai-song.js`、`admin.html` 分别硬编码 Supabase 地址和 key。

`SUPABASE_KEY` 为浏览器可公开的 publishable key；它不是 service role key。管理员权限和写入权限仍必须由 Supabase Auth、RLS 和 Edge Function 服务端校验。

## 部署

这是静态站点，不需要构建步骤。

1. 将仓库连接到 Cloudflare Pages 或其他静态托管。
2. 构建命令留空。
3. 输出目录使用仓库根目录。
4. 确保 `index.html`、`admin.html`、`config.js`、`ai-song.js` 在同一发布根目录。
5. 在 Supabase 中部署并配置上述 Edge Functions、Storage、数据表/RPC 与 RLS。
6. 在 Supabase Secrets 中配置生成服务需要的私密密钥，例如 `HF_TOKEN`、`STABILITY_API_KEY`；不要放进 `config.js`。

## 上线前检查

- 普通上传只触发一次，不再被第二套 `onclick` 覆盖。
- `config.js` 是 Supabase 前端配置唯一来源。
- 浏览器 Network 中不应直接请求 Hugging Face Gradio Space。
- 人声生成只请求 `aimusic-vocal-generate`。
- 纯音乐生成只请求 `aimusic-generate-audio`。
- 管理员默认发布名为 `GlobalYouXuan`。
- `app.js`、`test.txt` 不应存在于生产仓库。
