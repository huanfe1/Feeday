# feeday

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

TODO:

- [ ] 文章视图与媒体视图切换
- [ ] 设置弹窗规划 、包括 RSSHub 自定义源、头像代理地址、显示数据库文件大小
- [ ] 文章侧边栏偶尔会出现选择项闪烁情况
- [ ] 文件夹直接在 Feeds 上新建和重命名还有删除，参考 Windows 新建文件夹逻辑
- [ ] 文章显示内容调整要显示的元素以及安全性问题
- [ ] 文章显示原文设置的作者文字
- [ ] 文章侧边栏右侧显示图片
- [x] 文章如果包含 podcast 记得在内容处显示
- [ ] 订阅源处理单位是统一还是按照文件夹（待定）
- [ ] 订阅源需要一个统一操作的方式，目前想到（鼠标拖动框选、设置弹窗列表选择）
- [x] Logo 更换
- [ ] 重写导入 Opml 逻辑
- [ ] 记忆窗口大小以及侧边栏宽度
