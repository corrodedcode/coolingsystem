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
      this.hotFlows = [];
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
        this.hotFlows = data.hotFlows || [];  // 加载热流股数据
        
        this.updateCoolersTable();
        this.updateFlowsTable();
        this.updateHotFlowsTable();  // 更新热流股表格
      } catch (error) {
        console.error('加载示例数据失败:', error);
      }
    }

    setupEventListeners() {
      // Edit按钮事件
      document.getElementById('edit-btn').addEventListener('click', () => {
        document.getElementById('list-select-modal').style.display = 'block';
      });

      // 列表选择事件
      document.getElementById('edit-coolers-btn').addEventListener('click', () => {
        document.getElementById('list-select-modal').style.display = 'none';
        document.getElementById('coolers-list-modal').style.display = 'block';
      });

      document.getElementById('edit-flows-btn').addEventListener('click', () => {
        document.getElementById('list-select-modal').style.display = 'none';
        document.getElementById('flows-list-modal').style.display = 'block';
      });

      document.getElementById('edit-hot-flows-btn').addEventListener('click', () => {
        document.getElementById('list-select-modal').style.display = 'none';
        document.getElementById('hot-flows-list-modal').style.display = 'block';
      });

      // 冷却器相关事件
      document.getElementById('add-cooler-btn').addEventListener('click', () => {
        document.getElementById('coolers-list-modal').style.display = 'none';
        this.showCoolerModal();
      });
      document.getElementById('cooler-form').addEventListener('submit', (e) => this.handleCoolerSubmit(e));
      
      // 水流股相关事件
      document.getElementById('add-flow-btn').addEventListener('click', () => {
        document.getElementById('flows-list-modal').style.display = 'none';
        this.showFlowModal();
      });
      document.getElementById('flow-form').addEventListener('submit', (e) => this.handleFlowSubmit(e));
      
      // 热流股相关事件
      document.getElementById('add-hot-flow-btn').addEventListener('click', () => {
        document.getElementById('hot-flows-list-modal').style.display = 'none';
        this.showHotFlowModal();
      });
      document.getElementById('hot-flow-form').addEventListener('submit', (e) => this.handleHotFlowSubmit(e));
      
      // 功能按钮事件
      document.getElementById('generate-btn').addEventListener('click', () => {
        console.log('Generating 3D view...');
        this.generate3DView();
      });

      // 预留的功能按钮事件
      document.getElementById('generate-network-btn').addEventListener('click', () => {
        if (!this.isFeatureAvailable('generate-network')) return;
        this.generateNetwork();
      });

      document.getElementById('calculate-network-btn').addEventListener('click', () => {
        if (!this.isFeatureAvailable('calculate-network')) return;
        this.calculateNetwork();
      });

      document.getElementById('optimize-network-btn').addEventListener('click', () => {
        if (!this.isFeatureAvailable('optimize-network')) return;
        this.optimizeNetwork();
      });
      
      // 关闭按钮事件
      document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal');
          modal.style.display = 'none';
          
          // 如果关闭的是编辑弹窗，则显示对应的列表弹窗
          if (modal.id === 'cooler-modal') {
            document.getElementById('coolers-list-modal').style.display = 'block';
          } else if (modal.id === 'flow-modal') {
            document.getElementById('flows-list-modal').style.display = 'block';
          } else if (modal.id === 'hot-flow-modal') {
            document.getElementById('hot-flows-list-modal').style.display = 'block';
          }
        });
      });
    }

    // 功能可用性检查
    isFeatureAvailable(featureId) {
      // 目前所有预留功能都未实现
      alert('该功能正在开发中，敬请期待！');
      return false;
    }

    // 预留的功能接口
    generateNetwork() {
      console.log('Generate network feature will be implemented here');
    }

    calculateNetwork() {
      console.log('Calculate network feature will be implemented here');
    }

    optimizeNetwork() {
      console.log('Optimize network feature will be implemented here');
    }

    showCoolerModal(coolerData = null, index = undefined) {
      const modal = document.getElementById('cooler-modal');
      const form = document.getElementById('cooler-form');
      
      // 重置表单
      form.reset();
      // 设置编辑索引
      form.dataset.editIndex = index;
      
      if (coolerData) {
        // 编辑现有冷却器
        Object.entries(coolerData).forEach(([key, value]) => {
          const input = form.elements[key];
          if (input) input.value = value;
        });
      }
      
      modal.style.display = 'block';
    }

    showFlowModal(flowData = null, index = undefined) {
      const modal = document.getElementById('flow-modal');
      const form = document.getElementById('flow-form');
      
      // 重置表单
      form.reset();
      // 设置编辑索引
      form.dataset.editIndex = index;
      
      if (flowData) {
        // 编辑现有水流股
        const { name, sources, path, destinations } = flowData;
        form.elements.name.value = name;
        form.elements.sources.value = sources.join(',');
        form.elements.path.value = path.join(',');
        form.elements.destinations.value = destinations.join(',');
      }
      
      modal.style.display = 'block';
    }

    showHotFlowModal(hotFlowData = null, index = undefined) {
      const modal = document.getElementById('hot-flow-modal');
      const form = document.getElementById('hot-flow-form');
      
      // 重置表单
      form.reset();
      // 设置编辑索引
      form.dataset.editIndex = index;
      
      if (hotFlowData) {
        // 编辑现有热流股
        const { name, inletTemp, outletTemp, mcp, heatCapacity, flowRate, coolers } = hotFlowData;
        form.elements.name.value = name;
        form.elements.inletTemp.value = inletTemp;
        form.elements.outletTemp.value = outletTemp;
        form.elements.mcp.value = mcp;
        form.elements.heatCapacity.value = heatCapacity;
        form.elements.flowRate.value = flowRate;
        form.elements.coolers.value = coolers.join(',');
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
      
      const editIndex = event.target.dataset.editIndex;
      if (editIndex !== undefined) {
        // 编辑现有冷却器
        this.coolers[editIndex] = coolerData;
      } else {
        // 添加新冷却器
        this.coolers.push(coolerData);
      }
      
      this.updateCoolersTable();
      document.getElementById('cooler-modal').style.display = 'none';
      document.getElementById('coolers-list-modal').style.display = 'block';
    }

    handleFlowSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const flowData = {
        name: formData.get('name'),
        sources: formData.get('sources').split(',').map(s => s.trim()).filter(Boolean),
        path: formData.get('path').split(',').map(s => s.trim()).filter(Boolean),
        destinations: formData.get('destinations').split(',').map(s => s.trim()).filter(Boolean)
      };
      
      const editIndex = event.target.dataset.editIndex;
      if (editIndex !== undefined) {
        // 编辑现有水流股
        this.flows[editIndex] = flowData;
      } else {
        // 添加新水流股
        this.flows.push(flowData);
      }
      
      this.updateFlowsTable();
      document.getElementById('flow-modal').style.display = 'none';
      document.getElementById('flows-list-modal').style.display = 'block';
    }

    handleHotFlowSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const hotFlowData = {
        name: formData.get('name'),
        inletTemp: Number(formData.get('inletTemp')),
        outletTemp: Number(formData.get('outletTemp')),
        mcp: Number(formData.get('mcp')),
        heatCapacity: Number(formData.get('heatCapacity')),
        flowRate: Number(formData.get('flowRate')),
        coolers: formData.get('coolers').split(',').map(s => s.trim()).filter(Boolean)
      };
      
      const editIndex = event.target.dataset.editIndex;
      if (editIndex !== undefined) {
        // 编辑现有热流股
        this.hotFlows[editIndex] = hotFlowData;
      } else {
        // 添加新热流股
        this.hotFlows.push(hotFlowData);
      }
      
      this.updateHotFlowsTable();
      document.getElementById('hot-flow-modal').style.display = 'none';
      document.getElementById('hot-flows-list-modal').style.display = 'block';
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
                <td>
                  ${flow.sources.join(' + ')} → 
                  ${flow.path.length ? flow.path.join(' → ') + ' → ' : ''}
                  ${flow.destinations.join(' | ')}
                </td>
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

    updateHotFlowsTable() {
      const container = document.getElementById('hot-flows-table');
      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>入口温度</th>
              <th>出口温度</th>
              <th>MCP</th>
              <th>热容量</th>
              <th>流速</th>
              <th>冷却器</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${this.hotFlows.map((flow, index) => `
              <tr>
                <td>${flow.name}</td>
                <td>${flow.inletTemp} ℃</td>
                <td>${flow.outletTemp} ℃</td>
                <td>${flow.mcp} kJ/℃·h</td>
                <td>${flow.heatCapacity} kW</td>
                <td>${flow.flowRate} kg/h</td>
                <td>${flow.coolers.join(' → ')}</td>
                <td>
                  <button onclick="app.editHotFlow(${index})">编辑</button>
                  <button onclick="app.deleteHotFlow(${index})">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    editCooler(index) {
      this.showCoolerModal(this.coolers[index], index);
    }

    deleteCooler(index) {
      if (confirm('确定要删除这个冷却器吗？')) {
        this.coolers.splice(index, 1);
        this.updateCoolersTable();
      }
    }

    editFlow(index) {
      this.showFlowModal(this.flows[index], index);
    }

    deleteFlow(index) {
      if (confirm('确定要删除这个水流股吗？')) {
        this.flows.splice(index, 1);
        this.updateFlowsTable();
      }
    }

    editHotFlow(index) {
      const hotFlowData = this.hotFlows[index];
      this.showHotFlowModal(hotFlowData, index);
    }

    deleteHotFlow(index) {
      if (confirm('确定要删除这个热流股吗？')) {
        this.hotFlows.splice(index, 1);
        this.updateHotFlowsTable();
      }
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

        // 添加所有热流股
        console.log('Adding hot flows:', this.hotFlows);
        this.hotFlows.forEach(flow => {
          this.model3D.addHotFlow(flow);  // 添加热流股到3D视图
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

// 在加载数据后调用Python计算
async function loadAndCalculateData() {
  try {
    const response = await fetch('sample-data.json');
    const data = await response.json();
    
    // 调用Python进行计算
    const calculatedResults = await window.electronAPI.calculateData(data);
    
    // 更新界面显示计算结果
    updateVisualization(data, calculatedResults);
    
    return data;
  } catch (error) {
    console.error('加载或计算数据时出错:', error);
    throw error;
  }
}

function updateVisualization(data, calculatedResults) {
  // 更新热流股显示
  data.hotFlows.forEach(hotFlow => {
    const results = calculatedResults.hotFlows[hotFlow.name];
    if (results) {
      // 添加计算结果到热流股数据中
      hotFlow.heatExchange = results.heatExchange;
      hotFlow.efficiencies = results.efficiencies;
    }
  });

  // 更新冷却器显示
  data.coolers.forEach(cooler => {
    const results = calculatedResults.coolers[cooler.name];
    if (results) {
      // 添加计算结果到冷却器数据中
      cooler.totalHeatLoad = results.totalHeatLoad;
      cooler.waterFlowRate = results.waterFlowRate;
    }
  });

  // 更新3D可视化
  if (coolingSystem) {
    coolingSystem.clearScene();
    
    // 添加冷却器
    data.coolers.forEach(cooler => {
      coolingSystem.addCooler(cooler);
    });

    // 添加流股
    data.flows.forEach(flow => {
      coolingSystem.addFlow(flow);
    });

    // 添加热流股
    data.hotFlows.forEach(hotFlow => {
      coolingSystem.addHotFlow(hotFlow);  // 添加热流股到3D视图
    });
  }
}

// 修改初始化函数
async function init() {
  try {
    // 等待API就绪
    await waitForAPI();
    
    // 创建3D系统实例
    const container = document.getElementById('3d-container');
    coolingSystem = new CoolingSystem3D(container);
    
    // 加载并计算数据
    const data = await loadAndCalculateData();
    
    // 设置事件监听器等其他初始化操作...
  } catch (error) {
    console.error('初始化失败:', error);
  }
}