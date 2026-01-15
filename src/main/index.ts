import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import dayjs from 'dayjs';
import { BrowserWindow, app, ipcMain, session, shell } from 'electron';
import schedule from 'node-schedule';
import { join } from 'path';

import icon from '../../resources/icon.png?asset';
import { refreshFeed } from './database';

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 1000,
        minHeight: 600,
        show: false,
        frame: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
        },
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    ipcMain.on('window-close', () => {
        mainWindow.close();
    });
    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });
    ipcMain.on('window-maximize', () => {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    });
    ipcMain.handle('get-window-state', () => mainWindow.isMaximized());

    mainWindow.webContents.setWindowOpenHandler(details => {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });

    const refreshFeedHandle = (timeLimit?: boolean) => {
        console.log(dayjs().format('YYYY-MM-DD HH:mm:ss'), 'refreshFeed');
        refreshFeed(timeLimit).then(() => mainWindow.webContents.send('refresh-feed'));
    };
    refreshFeedHandle(false);

    const every10minTask = schedule.scheduleJob('*/10 * * * *', () => refreshFeedHandle());
    app.on('before-quit', () => every10minTask.cancel());

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    app.commandLine.appendSwitch('disable-autofill-keyboard-accessory-view');
    // 或者尝试禁用自动填充相关功能
    app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');

    const { platform } = process;
    if (platform === 'win32') {
        // Change the default font-family and font-size of the devtools.
        // Make it consistent with Chrome on Windows, instead of SimSun.
        // ref: [[Feature Request]: Add possibility to change DevTools font · Issue #42055 · electron/electron](https://github.com/electron/electron/issues/42055)
        mainWindow.webContents.on('devtools-opened', () => {
            setupDevToolsFont(mainWindow);
        });
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    session.defaultSession.setProxy({
        proxyRules: 'http://127.0.0.1:7890',
    });

    import('./database/hook');

    createWindow();

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function setupDevToolsFont(window: BrowserWindow) {
    // source-code-font: For code such as Elements panel
    // monospace-font: For sidebar such as Event Listener Panel
    const css = `:root {--devtool-font-family: consolas, operator mono, Cascadia Code, OperatorMonoSSmLig Nerd Font, "Agave Nerd Font", "Cascadia Code PL", monospace !important; --source-code-font-family:var(--devtool-font-family); --source-code-font-size: 13px; --monospace-font-family: var(--devtool-font-family);--monospace-font-size: 13px;}`;
    const js = `
      const overriddenStyle = document.createElement('style');
      overriddenStyle.innerHTML = '${css.replaceAll('\n', ' ')}';
      document.body.append(overriddenStyle);
      document.querySelectorAll('.platform-windows').forEach(el => el.classList.remove('platform-windows'));
      addStyleToAutoComplete();
      const observer = new MutationObserver((mutationList, observer) => {
          for (const mutation of mutationList) {
              if (mutation.type === 'childList') {
                  for (let i = 0; i < mutation.addedNodes.length; i++) {
                      const item = mutation.addedNodes[i];
                      if (item instanceof HTMLElement && item.classList.contains('editor-tooltip-host')) {
                          addStyleToAutoComplete();
                      }
                  }
              }
          }
      });
      observer.observe(document.body, {childList: true});
      function addStyleToAutoComplete() {
          document.querySelectorAll('.editor-tooltip-host').forEach(element => {
              if (element.shadowRoot && element.shadowRoot.querySelectorAll('[data-key="overridden-dev-tools-font"]').length === 0) {
                  const overriddenStyle = document.createElement('style');
                  overriddenStyle.setAttribute('data-key', 'overridden-dev-tools-font');
                  overriddenStyle.innerHTML = '.cm-tooltip-autocomplete ul[role=listbox] {font-family: consolas !important;}';
                  element.shadowRoot.append(overriddenStyle);
              }
          });
      }
    `;
    window.webContents.devToolsWebContents?.executeJavaScript(js);
}
