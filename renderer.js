// renderer.js
console.log('Renderer script starting...');

// 等待 API 准备就绪
document.addEventListener('apiReady', () => {
  console.log('apiReady event received');
  console.log('window.api status:', !!window.api);
  
  const { CoolingSystem3D, CoolingSystemInputForm } = window.api;

  class CoolingSystemApp {
    constructor() {
      this.coolers = [];
      this.flows = [];
      this.model3D = null;
      this.initializeComponents();
      this.loadSampleData();
      this.setupEventListeners();
    }

    async initializeComponents() {
      try {
        // 初始化表单管理器
        this.formManager = CoolingSystemInputForm.create();

        // 初始化3D视图
        const sceneContainer = document.getElementById('scene-container');
        if (!sceneContainer) {
          throw new Error('Scene container not found');
        }
        
        // 确保CoolingSystem3D存在且可以创建实例
        if (!CoolingSystem3D || !CoolingSystem3D.create) {
          throw new Error('CoolingSystem3D not available');
        }
        
        // 创建3D模型实例
        this.model3D = CoolingSystem3D.create(sceneContainer);
        console.log('3D model initialized:', this.model3D);
      } catch (error) {
        console.error('初始化组件失败:', error);
      }
    }

    async loadSampleData() {
      try {
        const response = await fetch('./sample-data.json');
        const data = await response.json();
        this.coolers = data.coolers || [];
        this.flows = data.flows || [];
        
        this.updateCoolersTable();
        this.updateFlowsTable();
      } catch (error) {
        console.error('加载示例数据失败:', error);
      }
    }

    setupEventListeners() {
      // 冷却器相关事件
      document.getElementById('add-cooler-btn').addEventListener('click', () => this.showCoolerModal());
      document.getElementById('cooler-form').addEventListener('submit', (e) => this.handleCoolerSubmit(e));
      
      // 水流股相关事件
      document.getElementById('add-flow-btn').addEventListener('click', () => this.showFlowModal());
      document.getElementById('flow-form').addEventListener('submit', (e) => this.handleFlowSubmit(e));
      
      // 生成3D视图
      document.getElementById('generate-btn').addEventListener('click', () => {
        console.log('Generating 3D view...');
        this.generate3DView();
      });
      
      // 关闭按钮事件
      document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.target.closest('.modal').style.display = 'none';
        });
      });
    }

    showCoolerModal(coolerData = null) {
      const modal = document.getElementById('cooler-modal');
      const form = document.getElementById('cooler-form');
      
      if (coolerData) {
        // 编辑现有冷却器
        Object.entries(coolerData).forEach(([key, value]) => {
          const input = form.elements[key];
          if (input) input.value = value;
        });
      } else {
        // 添加新冷却器
        form.reset();
      }
      
      modal.style.display = 'block';
    }

    showFlowModal(flowData = null) {
      const modal = document.getElementById('flow-modal');
      const form = document.getElementById('flow-form');
      
      if (flowData) {
        // 编辑现有水流股
        Object.entries(flowData).forEach(([key, value]) => {
          const input = form.elements[key];
          if (input) {
            if (Array.isArray(value)) {
              input.value = value.join(',');
            } else {
              input.value = value;
            }
          }
        });
      } else {
        // 添加新水流股
        form.reset();
      }
      
      modal.style.display = 'block';
    }

    handleCoolerSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const coolerData = {
        name: formData.get('name'),
        x: Number(formData.get('x')),
        y: Number(formData.get('y')),
        z: Number(formData.get('z')),
        inTemp: Number(formData.get('inTemp')),
        outTemp: Number(formData.get('outTemp'))
      };
      
      this.coolers.push(coolerData);
      this.updateCoolersTable();
      document.getElementById('cooler-modal').style.display = 'none';
    }

    handleFlowSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const flowData = {
        name: formData.get('name'),
        source: formData.get('source'),
        path: formData.get('path').split(',').map(s => s.trim()).filter(Boolean),
        destinations: formData.get('destinations')
      };
      
      this.flows.push(flowData);
      this.updateFlowsTable();
      document.getElementById('flow-modal').style.display = 'none';
    }

    updateCoolersTable() {
      const container = document.getElementById('coolers-table');
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>位置</th>
              <th>温度</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${this.coolers.map((cooler, index) => `
              <tr>
                <td>${cooler.name}</td>
                <td>(${cooler.x}, ${cooler.y}, ${cooler.z})</td>
                <td>${cooler.inTemp}°C → ${cooler.outTemp}°C</td>
                <td>
                  <button onclick="app.editCooler(${index})">编辑</button>
                  <button onclick="app.deleteCooler(${index})">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    updateFlowsTable() {
      const container = document.getElementById('flows-table');
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>路径</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${this.flows.map((flow, index) => `
              <tr>
                <td>${flow.name}</td>
                <td>${flow.source} → ${flow.path.join(' → ')} → ${flow.destinations}</td>
                <td>
                  <button onclick="app.editFlow(${index})">编辑</button>
                  <button onclick="app.deleteFlow(${index})">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    editCooler(index) {
      this.showCoolerModal(this.coolers[index]);
    }

    deleteCooler(index) {
      this.coolers.splice(index, 1);
      this.updateCoolersTable();
    }

    editFlow(index) {
      this.showFlowModal(this.flows[index]);
    }

    deleteFlow(index) {
      this.flows.splice(index, 1);
      this.updateFlowsTable();
    }

    generate3DView() {
      console.log('Generating 3D view with model:', this.model3D);
      if (!this.model3D) {
        console.error('3D model not initialized');
        return;
      }

      try {
        // 清空现有场景
        this.model3D.clearScene();
        
        // 添加所有冷却器
        console.log('Adding coolers:', this.coolers);
        this.coolers.forEach(cooler => {
          this.model3D.addCooler(cooler);
        });
        
        // 添加所有水流股
        console.log('Adding flows:', this.flows);
        this.flows.forEach(flow => {
          this.model3D.addFlow(flow);
        });
        
        // 渲染场景
        this.model3D.render();
      } catch (error) {
        console.error('Error generating 3D view:', error);
      }
    }
  }

  // 创建应用实例并挂载到window对象以便访问
  window.app = new CoolingSystemApp();
});