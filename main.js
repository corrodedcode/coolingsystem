// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
            sandbox: false,
            webviewTag: false,
            enableRemoteModule: false,
            experimentalFeatures: true
        }
    });
    win.loadFile('index.html');
    // 启用开发者工具
    win.webContents.openDevTools();
    
    // 添加以下代码检查WebGL支持
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript('!!window.WebGLRenderingContext', (result) => {
            console.log('WebGL Support:', result);
        });
    });
}
console.log('hello world:');
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());