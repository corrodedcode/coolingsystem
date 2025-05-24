const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

console.log('Preload script starting...');

// 异步导入模块
Promise.all([
  import('./components/model3D.mjs').catch(e => {
    console.error('Error importing model3D.mjs:', e);
    return { CoolingSystem3D: null };
  }),
  import('./components/inputForm.mjs').catch(e => {
    console.error('Error importing inputForm.mjs:', e);
    return { CoolingSystemInputForm: null };
  })
]).then(([model3D, inputForm]) => {
  console.log('All modules loaded:', {
    model3D: !!model3D.CoolingSystem3D,
    inputForm: !!inputForm.CoolingSystemInputForm
  });

  // 创建构造函数包装器
  function createClassWrapper(Constructor) {
    if (!Constructor) return null;
    
    return {
      create: (...args) => {
        try {
          const instance = new Constructor(...args);
          
          // 返回一个包含所有实例方法的对象
          return {
            // 通用方法
            clearScene: (...args) => instance.clearScene(...args),
            render: (...args) => instance.render(...args),
            
            // 冷却器相关方法
            addCooler: (...args) => instance.addCooler(...args),
            addFlow: (...args) => instance.addFlow(...args),
            
            // 表单相关方法
            addCoolerInputs: (...args) => instance.addCoolerInputs(...args),
            addFlowInputs: (...args) => instance.addFlowInputs(...args),
            handleSubmit: (...args) => instance.handleSubmit(...args),
            loadSampleData: (...args) => instance.loadSampleData(...args),
            getData: (...args) => instance.getData(...args),
            validateData: (...args) => instance.validateData(...args)
          };
        } catch (error) {
          console.error('Error creating instance:', error);
          throw error;
        }
      }
    };
  }

  // 暴露到渲染进程中
  contextBridge.exposeInMainWorld('api', {
    CoolingSystem3D: createClassWrapper(model3D.CoolingSystem3D),
    CoolingSystemInputForm: createClassWrapper(inputForm.CoolingSystemInputForm),
    // 暴露 IPC 通信方法
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    // 添加 ready 事件监听器
    onReady: (callback) => {
      console.log('API ready callback registered');
      callback();
    }
  });

  console.log('API exposed to window.api');
  // 触发一个自定义事件表明 API 已经准备就绪
  document.dispatchEvent(new CustomEvent('apiReady'));
  console.log('apiReady event dispatched');
}).catch(error => {
  console.error('Error in module loading process:', error);
});