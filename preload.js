const { contextBridge, ipcRenderer } = require('electron');
const { spawn } = require('child_process');
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
            addHotFlow: (...args) => instance.addHotFlow(...args),
            
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

  // 调用Python脚本进行计算
  async function calculateWithPython(data) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'python', 'calculate.py');
      const pythonProcess = spawn('python', [pythonScript]);
      
      let result = '';
      let error = '';

      // 发送数据到Python脚本
      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();

      // 接收Python脚本的输出
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      // 接收Python脚本的错误输出
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      // 处理脚本执行完成
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python脚本执行失败: ${error}`));
        } else {
          try {
            const calculatedData = JSON.parse(result);
            resolve(calculatedData);
          } catch (e) {
            reject(new Error(`解析Python输出失败: ${e.message}`));
          }
        }
      });
    });
  }

  // 暴露给渲染进程的API
  contextBridge.exposeInMainWorld('electronAPI', {
    // 添加新的计算API
    calculateData: async (data) => {
      try {
        const results = await calculateWithPython(data);
        return results;
      } catch (error) {
        console.error('计算错误:', error);
        throw error;
      }
    }
  });
}).catch(error => {
  console.error('Error in module loading process:', error);
});