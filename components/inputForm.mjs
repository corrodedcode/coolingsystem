export class CoolingSystemInputForm {
  constructor() {
    this.coolers = [];
    this.flows = [];
  }

  // 添加冷却器
  addCoolerInputs(coolerData = null) {
    const modal = document.getElementById('cooler-modal');
    const form = document.getElementById('cooler-form');
    
    if (coolerData) {
      Object.entries(coolerData).forEach(([key, value]) => {
        const input = form.elements[key];
        if (input) input.value = value;
      });
    } else {
      form.reset();
    }
    
    modal.style.display = 'block';
  }

  // 添加水流股
  addFlowInputs(flowData = null) {
    const modal = document.getElementById('flow-modal');
    const form = document.getElementById('flow-form');
    
    if (flowData) {
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
      form.reset();
    }
    
    modal.style.display = 'block';
  }

  // 处理表单提交
  handleSubmit(formData) {
    if (formData.type === 'cooler') {
      this.coolers.push({
        name: formData.name,
        x: Number(formData.x),
        y: Number(formData.y),
        z: Number(formData.z),
        inTemp: Number(formData.inTemp),
        outTemp: Number(formData.outTemp)
      });
    } else if (formData.type === 'flow') {
      this.flows.push({
        name: formData.name,
        source: formData.source,
        path: formData.path.split(',').map(s => s.trim()).filter(Boolean),
        destinations: formData.destinations
      });
    }
  }

  // 加载示例数据
  async loadSampleData() {
    try {
      const response = await fetch('./sample-data.json');
      const data = await response.json();
      this.coolers = data.coolers || [];
      this.flows = data.flows || [];
      return { coolers: this.coolers, flows: this.flows };
    } catch (error) {
      console.error('加载示例数据失败:', error);
      return { coolers: [], flows: [] };
    }
  }

  // 获取当前数据
  getData() {
    return {
      coolers: this.coolers,
      flows: this.flows
    };
  }

  // 验证数据
  validateData() {
    // 验证冷却器数据
    const coolerNames = new Set();
    for (const cooler of this.coolers) {
      if (!cooler.name || typeof cooler.name !== 'string') {
        throw new Error('冷却器名称无效');
      }
      if (coolerNames.has(cooler.name)) {
        throw new Error(`冷却器名称重复: ${cooler.name}`);
      }
      coolerNames.add(cooler.name);

      if (!Number.isFinite(cooler.x) || !Number.isFinite(cooler.y) || !Number.isFinite(cooler.z)) {
        throw new Error(`冷却器 ${cooler.name} 的坐标无效`);
      }
      if (!Number.isFinite(cooler.inTemp) || !Number.isFinite(cooler.outTemp)) {
        throw new Error(`冷却器 ${cooler.name} 的温度值无效`);
      }
    }

    // 验证水流股数据
    for (const flow of this.flows) {
      if (!flow.name || typeof flow.name !== 'string') {
        throw new Error('水流股名称无效');
      }
      if (!flow.source || !coolerNames.has(flow.source)) {
        throw new Error(`水流股 ${flow.name} 的源头冷却器不存在`);
      }
      if (!flow.destinations || !coolerNames.has(flow.destinations)) {
        throw new Error(`水流股 ${flow.name} 的终点冷却器不存在`);
      }
      for (const point of flow.path) {
        if (!coolerNames.has(point)) {
          throw new Error(`水流股 ${flow.name} 的途径点 ${point} 不存在`);
        }
      }
    }

    return true;
  }
}