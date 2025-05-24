class CoolingSystem2DChart {
  constructor(canvasId, data) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.data = data;
    
    this.initCanvas();
    this.drawFlowDiagram();
  }
  
  initCanvas() {
    // 设置画布尺寸
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawFlowDiagram() {
    // 绘制冷却器节点
    this.data.coolers.forEach(cooler => {
      // 绘制冷却器方框
      this.ctx.fillStyle = '#00aaff';
      this.ctx.fillRect(cooler.x * 10 + 50, cooler.y * 10 + 50, 60, 100);
      
      // 绘制入口标签
      this.ctx.fillStyle = '#00cc00';
      this.ctx.fillRect(cooler.x * 10 + 50, cooler.y * 10 + 50 - 20, 30, 20);
      this.ctx.fillStyle = 'black';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`入口: ${cooler.inTemp}℃`, cooler.x * 10 + 50, cooler.y * 10 + 50 - 5);
      
      // 绘制出口标签
      this.ctx.fillStyle = '#cc0000';
      this.ctx.fillRect(cooler.x * 10 + 50 + 30, cooler.y * 10 + 50 - 20, 30, 20);
      this.ctx.fillStyle = 'black';
      this.ctx.fillText(`出口: ${cooler.outTemp}℃`, cooler.x * 10 + 50 + 30, cooler.y * 10 + 50 - 5);
      
      // 绘制冷却器名称
      this.ctx.fillStyle = 'white';
      this.ctx.font = '14px Arial';
      this.ctx.fillText(cooler.name, cooler.x * 10 + 50 + 10, cooler.y * 10 + 50 + 20);
    });
    
    // 绘制水流股连接
    this.data.flows.forEach(flow => {
      // 查找起点冷却器
      const sourceCooler = this.data.coolers.find(c => c.name === flow.source);
      
      // 处理多个终点
      flow.destinations.forEach(dest => {
        const destCooler = this.data.coolers.find(c => c.name === dest);
        
        if (sourceCooler && destCooler) {
          // 绘制连接线
          this.ctx.beginPath();
          this.ctx.moveTo(sourceCooler.x * 10 + 50 + 30, sourceCooler.y * 10 + 50 + 60);
          this.ctx.lineTo(destCooler.x * 10 + 50 + 30, destCooler.y * 10 + 50 + 60);
          this.ctx.strokeStyle = '#0066ff';
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
          
          // 绘制水流方向箭头
          this.ctx.beginPath();
          const arrowX = (sourceCooler.x * 10 + 50 + 30 + destCooler.x * 10 + 50 + 30) / 2;
          const arrowY = (sourceCooler.y * 10 + 50 + 60 + destCooler.y * 10 + 50 + 60) / 2;
          
          this.ctx.moveTo(arrowX, arrowY - 10);
          this.ctx.lineTo(arrowX + 10, arrowY);
          this.ctx.lineTo(arrowX, arrowY + 10);
          this.ctx.strokeStyle = '#ff0000';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      });
    });
  }
}
export { CoolingSystem2DChart };