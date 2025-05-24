  populateInitialData(data) {
    if (!data) return;
    
    // 预填充冷却器
    this.cooleCount = data.coolers.length;
    data.coolers.forEach((cooler, index) => {
      const section = document.createElement('div');
      section.className = 'cooler-inputs';
      section.innerHTML = `
        <div>
          <label>名称: <input name="cooler-${index}-name" value="${cooler.name}" required></label>
          <label>X: <input name="cooler-${index}-x" type="number" value="${cooler.x}" step="1" required></label>
          <label>Y: <input name="cooler-${index}-y" type="number" value="${cooler.y}" step="1" required></label>
          <label>Z: <input name="cooler-${index}-z" type="number" value="${cooler.z}" step="1" required></label>
          <label>入口温度: <input name="cooler-${index}-inTemp" type="number" value="${cooler.inTemp}" step="0.1" required></label>
          <label>出口温度: <input name="cooler-${index}-outTemp" type="number" value="${cooler.outTemp}" step="0.1" required></label>
        </div>
      `;
      
      this.container.querySelector('.coolers-section').appendChild(section);
    });
    
    // 预填充水流股
    this.flowCount = data.flows.length;
    data.flows.forEach((flow, index) => {
      const section = document.createElement('div');
      section.className = 'flow-inputs';
      section.innerHTML = `
        <div>
          <label>名称: <input name="flow-${index}-name" value="${flow.name}" required></label>
          <label>源头: <input name="flow-${index}-source" value="${flow.source}" required></label>
          <label>途径: <input name="flow-${index}-path" value="${flow.path.join(',')}" required></label>
          <label>终端: <input name="flow-${index}-dest" value="${flow.destinations.join(',')}" required></label>
        </div>
      `;
      
      this.container.querySelector('.flows-section').appendChild(section);
    });
  }