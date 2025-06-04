import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CoolingSystem3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    this.coolers = new Map();
    this.flows = new Map();
    this.hotFlows = new Map();  // 添加热流股Map
    
    // 添加射线检测器和提示框
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tooltip = this.createTooltip();
    
    this.init();
  }

  createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.fontSize = '14px';
    tooltip.style.display = 'none';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
    this.container.appendChild(tooltip);
    return tooltip;
  }

  init() {
    // 设置渲染器
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0xf0f0f0);
    this.container.appendChild(this.renderer.domElement);

    // 设置相机位置
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // 添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(ambientLight, directionalLight);

    // 添加网格
    const gridHelper = new THREE.GridHelper(20, 20);
    this.scene.add(gridHelper);

    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    // 设置动画循环
    this.animate();

    // 添加窗口大小变化监听
    window.addEventListener('resize', () => this.onWindowResize());

    // 添加鼠标移动事件监听
    this.container.addEventListener('mousemove', (event) => this.onMouseMove(event));
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  clearScene() {
    // 清除所有冷却器和管道
    this.coolers.forEach(obj => this.scene.remove(obj));
    this.flows.forEach(obj => this.scene.remove(obj));
    this.hotFlows.forEach(obj => this.scene.remove(obj));
    this.coolers.clear();
    this.flows.clear();
    this.hotFlows.clear();
  }

  createCoolerMesh(cooler) {
    // 创建换热器的组合模型
    const group = new THREE.Group();

    // 创建壳体（圆柱体）
    const shellGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 32);
    const shellMaterial = new THREE.MeshPhongMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.8
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.rotation.z = Math.PI / 2; // 使圆柱体水平放置
    group.add(shell);

    // 创建两端的管箱（略小的圆柱体）
    const boxGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32);
    const boxMaterial = new THREE.MeshPhongMaterial({
      color: 0x2980b9,
      transparent: true,
      opacity: 0.9
    });

    // 左侧管箱
    const leftBox = new THREE.Mesh(boxGeometry, boxMaterial);
    leftBox.rotation.z = Math.PI / 2;
    leftBox.position.x = -0.85;
    group.add(leftBox);

    // 右侧管箱
    const rightBox = new THREE.Mesh(boxGeometry, boxMaterial);
    rightBox.rotation.z = Math.PI / 2;
    rightBox.position.x = 0.85;
    group.add(rightBox);

    // 添加管口（小圆柱体）
    const nozzleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
    const nozzleMaterial = new THREE.MeshPhongMaterial({
      color: 0x2c3e50,
      transparent: true,
      opacity: 1
    });

    // 上部管口
    const topNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    topNozzle.position.set(0, 0.4, 0);
    group.add(topNozzle);

    // 下部管口
    const bottomNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    bottomNozzle.position.set(0, -0.4, 0);
    group.add(bottomNozzle);

    // 添加支架
    const supportGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const supportMaterial = new THREE.MeshPhongMaterial({
      color: 0x7f8c8d
    });

    // 左支架
    const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    leftSupport.position.set(-0.4, -0.5, 0);
    group.add(leftSupport);

    // 右支架
    const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    rightSupport.position.set(0.4, -0.5, 0);
    group.add(rightSupport);

    // 设置整个组的位置
    group.position.set(cooler.x, cooler.y, cooler.z);
    
    // 添加标签
    const sprite = this.createLabel(cooler.name);
    sprite.position.set(0, 1.5, 0);
    group.add(sprite);
    
    return group;
  }

  createLabel(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = 'Bold 20px Arial';
    context.fillStyle = 'black';
    context.fillText(text, 0, 24);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    
    return sprite;
  }

  createFlowPipe(start, end) {
    // 创建管道的3D模型
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0.6
    });
    
    const pipe = new THREE.Mesh(geometry, material);
    
    // 将管道旋转到正确的方向
    pipe.position.copy(start);
    pipe.position.addScaledVector(direction, 0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    
    return pipe;
  }

  addCooler(cooler) {
    const mesh = this.createCoolerMesh(cooler);
    // 存储冷却器数据
    mesh.userData = {
      inTemp: cooler.inTemp,
      outTemp: cooler.outTemp
    };
    this.scene.add(mesh);
    this.coolers.set(cooler.name, mesh);
  }

  addFlow(flow) {
    const { name, sources, path, destinations, startTemp, endTemp } = flow;
    
    // 创建管道路径点
    const points = [];
    
    // 添加源点
    sources.forEach(source => {
      const cooler = this.coolers.get(source);
      if (cooler) {
        points.push(cooler.position.clone());
      }
    });

    // 添加路径点
    path.forEach(pointName => {
      const cooler = this.coolers.get(pointName);
      if (cooler) {
        points.push(cooler.position.clone());
      }
    });

    // 添加目标点
    destinations.forEach(dest => {
      const cooler = this.coolers.get(dest);
      if (cooler) {
        points.push(cooler.position.clone());
      }
    });

    // 如果有足够的点，创建直角管道
    if (points.length >= 2) {
      const pipes = new THREE.Group();
      
      // 为管道添加用户数据
      pipes.userData = {
        flowName: name,
        startTemp: startTemp,
        endTemp: endTemp
      };
      
      // 为每对相邻点创建直角管道
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        
        // 创建直角路径的三个点
        const corner1 = start.clone();
        const corner2 = new THREE.Vector3(end.x, start.y, start.z);
        
        // 创建第一段管道（水平方向）
        if (corner1.distanceTo(corner2) > 0.1) {
          const pipe1 = this.createFlowPipe(corner1, corner2);
          pipes.add(pipe1);
        }
        
        // 创建第二段管道（垂直方向）
        if (corner2.distanceTo(end) > 0.1) {
          const pipe2 = this.createFlowPipe(corner2, end);
          pipes.add(pipe2);
        }
      }
      
      this.scene.add(pipes);
      this.flows.set(name, pipes);
    }
  }

  addHotFlow(flow) {
    const { name, coolers: coolerNames, inletTemp, outletTemp, mcp, heatCapacity, flowRate } = flow;
    
    // 创建管道路径点
    const points = [];
    
    // 添加所有冷却器的点
    coolerNames.forEach(coolerName => {
      const cooler = this.coolers.get(coolerName);
      if (cooler) {
        points.push(cooler.position.clone());
      }
    });

    // 如果有足够的点，创建直角管道
    if (points.length >= 2) {
      const pipes = new THREE.Group();
      
      // 为管道添加用户数据，包括完整的热流股信息
      pipes.userData = {
        flowName: name,
        inletTemp,
        outletTemp,
        mcp,
        heatCapacity,
        flowRate,
        coolers: coolerNames  // 存储冷却器列表
      };
      
      // 为每对相邻点创建直角管道
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        
        // 创建直角路径的三个点
        const corner1 = start.clone();
        const corner2 = new THREE.Vector3(end.x, start.y, start.z);
        
        // 创建第一段管道（水平方向）
        if (corner1.distanceTo(corner2) > 0.1) {
          const pipe1 = this.createHotFlowPipe(corner1, corner2);
          pipes.add(pipe1);
        }
        
        // 创建第二段管道（垂直方向）
        if (corner2.distanceTo(end) > 0.1) {
          const pipe2 = this.createHotFlowPipe(corner2, end);
          pipes.add(pipe2);
        }
      }
      
      this.scene.add(pipes);
      this.hotFlows.set(name, pipes);
    }
  }

  createHotFlowPipe(start, end) {
    // 创建热流股管道的3D模型（使用红色系来区分）
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff4444,  // 红色系
      transparent: true,
      opacity: 0.8
    });
    
    const pipe = new THREE.Mesh(geometry, material);
    
    // 将管道旋转到正确的方向
    pipe.position.copy(start);
    pipe.position.addScaledVector(direction, 0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    
    return pipe;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onMouseMove(event) {
    // 计算鼠标在归一化设备坐标中的位置
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 获取所有可交互对象
    const interactiveObjects = [
      ...Array.from(this.flows.values()),
      ...Array.from(this.hotFlows.values()),
      ...Array.from(this.coolers.values())
    ].flatMap(obj => {
      if (obj instanceof THREE.Group) {
        return obj.children;
      }
      return [obj];
    });

    // 检测相交
    const intersects = this.raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
      // 找到相交的对象
      const intersectedObject = intersects[0].object;
      let data = null;
      let type = '';
      
      // 查找对应的流数据或冷却器数据
      for (const [name, obj] of this.flows) {
        if (obj === intersectedObject || (obj instanceof THREE.Group && obj.children.includes(intersectedObject))) {
          data = this.getFlowData(name, 'flow');
          type = 'flow';
          break;
        }
      }
      
      if (!data) {
        for (const [name, obj] of this.hotFlows) {
          if (obj === intersectedObject || (obj instanceof THREE.Group && obj.children.includes(intersectedObject))) {
            data = this.getFlowData(name, 'hotFlow');
            type = 'hotFlow';
            break;
          }
        }
      }

      if (!data) {
        for (const [name, obj] of this.coolers) {
          if (obj === intersectedObject || (obj instanceof THREE.Group && obj.children.includes(intersectedObject))) {
            data = this.getCoolerData(name);
            type = 'cooler';
            break;
          }
        }
      }

      if (data) {
        // 更新提示框位置和内容
        const screenPosition = intersects[0].point.clone();
        screenPosition.project(this.camera);

        const x = (screenPosition.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * this.container.clientHeight;

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
        this.tooltip.style.display = 'block';
        
        if (type === 'hotFlow') {
          this.tooltip.innerHTML = `
            <div style="font-weight: bold;">热流股: ${data.name}</div>
            <div>入口温度: ${data.inletTemp}°C</div>
            <div>出口温度: ${data.outletTemp}°C</div>
            <div>MCP: ${data.mcp} kJ/℃·h</div>
            <div>热容量: ${data.heatCapacity} kW</div>
            <div>流速: ${data.flowRate} kg/h</div>
          `;
        } else if (type === 'flow') {
          this.tooltip.innerHTML = `
            <div style="font-weight: bold;">流股: ${data.name}</div>
            <div>起点温度: ${data.startTemp}°C</div>
            <div>终点温度: ${data.endTemp}°C</div>
          `;
        } else if (type === 'cooler') {
          let tooltipContent = `
            <div style="font-weight: bold;">冷却器: ${data.name}</div>
            <div>冷却水温度: ${data.inTemp}°C → ${data.outTemp}°C</div>
          `;

          // 添加相关热流股信息
          const relatedHotFlows = this.getRelatedHotFlows(data.name);
          if (relatedHotFlows.length > 0) {
            tooltipContent += `<div style="margin-top: 8px; font-weight: bold;">相关热流股:</div>`;
            relatedHotFlows.forEach(hotFlow => {
              tooltipContent += `
                <div style="margin-left: 12px; margin-top: 4px; border-left: 2px solid #ff4444; padding-left: 8px;">
                  ${hotFlow.name}
                  <div style="margin-left: 8px; color: #666;">
                    入口温度: ${hotFlow.inletTemp}°C
                  </div>
                  <div style="margin-left: 8px; color: #666;">
                    出口温度: ${hotFlow.outletTemp}°C
                  </div>
                </div>
              `;
            });
          }

          this.tooltip.innerHTML = tooltipContent;
        }

        // 添加通用样式
        this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.tooltip.style.color = 'white';
        this.tooltip.style.padding = '12px';
        this.tooltip.style.borderRadius = '6px';
        this.tooltip.style.fontSize = '14px';
        this.tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      }
    } else {
      // 如果没有相交，隐藏提示框
      this.tooltip.style.display = 'none';
    }
  }

  getFlowData(flowName, type = 'flow') {
    if (type === 'hotFlow') {
      const hotFlow = this.hotFlows.get(flowName);
      if (hotFlow) {
        return {
          type: 'hotFlow',
          name: flowName,
          ...hotFlow.userData
        };
      }
    } else {
      const flow = this.flows.get(flowName);
      if (flow) {
        return {
          type: 'flow',
          name: flowName,
          ...flow.userData
        };
      }
    }
    return null;
  }

  getCoolerData(coolerName) {
    const cooler = this.coolers.get(coolerName);
    if (cooler) {
      return {
        name: coolerName,
        ...cooler.userData
      };
    }
    return null;
  }

  getRelatedHotFlows(coolerName) {
    const relatedHotFlows = [];
    // 遍历所有热流股
    for (const [name, hotFlow] of this.hotFlows) {
      const userData = hotFlow.userData;
      // 检查该热流股是否经过指定的冷却器
      if (userData && userData.coolers && userData.coolers.includes(coolerName)) {
        relatedHotFlows.push({
          name: userData.flowName,
          inletTemp: userData.inletTemp,
          outletTemp: userData.outletTemp
        });
      }
    }
    return relatedHotFlows;
  }
}