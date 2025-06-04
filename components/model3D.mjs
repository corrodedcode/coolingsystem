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
    
    // 初始化场景中心点
    this.center = new THREE.Vector3(0, 0, 0);
    
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

    // 设置相机位置和朝向
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(this.center);

    // 添加轨道控制器并配置
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // 设置控制器目标点
    this.controls.target.copy(this.center);
    
    // 启用平移和其他控制
    this.controls.enablePan = true;
    this.controls.panSpeed = 1.0;
    this.controls.screenSpacePanning = true;  // 使平移始终与屏幕空间平行
    
    // 启用阻尼效果使动画更平滑
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // 配置缩放
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 100;
    
    // 配置旋转
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.8;
    
    // 设置垂直旋转角度的限制
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    
    // 配置鼠标按键
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,    // 左键旋转
      MIDDLE: THREE.MOUSE.DOLLY,   // 中键缩放
      RIGHT: THREE.MOUSE.PAN       // 右键平移
    };

    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(ambientLight, directionalLight);

    // 添加网格
    const gridHelper = new THREE.GridHelper(50, 50);
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
    
    // 添加触摸事件支持
    this.container.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.onMouseMove(mouseEvent);
    }, { passive: false });

    // 添加键盘控制
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  onKeyDown(event) {
    const panSpeed = 1;
    switch(event.key) {
      case 'ArrowLeft':
        this.controls.target.x -= panSpeed;
        break;
      case 'ArrowRight':
        this.controls.target.x += panSpeed;
        break;
      case 'ArrowUp':
        this.controls.target.z -= panSpeed;
        break;
      case 'ArrowDown':
        this.controls.target.z += panSpeed;
        break;
      case 'PageUp':
        this.controls.target.y += panSpeed;
        break;
      case 'PageDown':
        this.controls.target.y -= panSpeed;
        break;
    }
    // 更新相机位置
    this.controls.update();
  }

  updateSceneCenter() {
    // 计算所有冷却器的中心点
    if (this.coolers.size > 0) {
      const center = new THREE.Vector3();
      let count = 0;
      
      this.coolers.forEach(cooler => {
        center.add(cooler.position);
        count++;
      });
      
      if (count > 0) {
        center.divideScalar(count);
        this.center.copy(center);
        this.controls.target.copy(center);
        this.controls.update();
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    // 更新控制器状态
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.controls.update();
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
    // 根据冷却器类型创建不同的模型
    if (cooler.name === '冷却塔') {
      return this.createCoolingTowerMesh(cooler);
    } else {
      return this.createStandardCoolerMesh(cooler);
    }
  }

  createCoolingTowerMesh(cooler) {
    const group = new THREE.Group();

    // 创建主体（立方体）
    const bodyGeometry = new THREE.BoxGeometry(2, 3, 2); // 宽度2，高度3，深度2
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x7B8994,
      metalness: 0.8,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5; // 将立方体抬高，使其底部在y=0平面
    group.add(body);

    // 创建三个风扇
    const fanRadius = 0.4;
    const fanHeight = 0.1;
    const fanPositions = [
      { x: -0.5, z: -0.5 },
      { x: -0.5, z: 0.5 },
      { x: 0.5, z: 0 }
    ];

    fanPositions.forEach(pos => {
      // 风扇底座（圆柱体）
      const baseGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
      const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0x4A4A4A,
        metalness: 0.7,
        roughness: 0.3
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.set(pos.x, 3.05, pos.z); // 放在立方体顶部
      group.add(base);

      // 风扇叶片（圆盘）
      const fanGeometry = new THREE.CylinderGeometry(fanRadius, fanRadius, fanHeight, 32);
      const fanMaterial = new THREE.MeshPhongMaterial({
        color: 0x2C3E50,
        metalness: 0.6,
        roughness: 0.4
      });
      const fan = new THREE.Mesh(fanGeometry, fanMaterial);
      fan.position.set(pos.x, 3.1, pos.z); // 放在底座上方
      group.add(fan);

      // 风扇中心（小圆柱）
      const centerGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 16);
      const centerMaterial = new THREE.MeshPhongMaterial({
        color: 0x34495E,
        metalness: 0.8,
        roughness: 0.2
      });
      const center = new THREE.Mesh(centerGeometry, centerMaterial);
      center.position.set(pos.x, 3.15, pos.z); // 放在风扇中心
      group.add(center);
    });

    // 添加进水管
    const inletPipeGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);
    const inletPipeMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A4A4A,
      metalness: 0.7,
      roughness: 0.3
    });
    const inletPipe = new THREE.Mesh(inletPipeGeometry, inletPipeMaterial);
    inletPipe.position.set(-1, 2, 0); // 放在左侧
    inletPipe.rotation.z = Math.PI / 2; // 水平放置
    group.add(inletPipe);

    // 添加出水管
    const outletPipeGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);
    const outletPipeMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A4A4A,
      metalness: 0.7,
      roughness: 0.3
    });
    const outletPipe = new THREE.Mesh(outletPipeGeometry, outletPipeMaterial);
    outletPipe.position.set(1, 0.5, 0); // 放在右侧底部
    outletPipe.rotation.z = Math.PI / 2; // 水平放置
    group.add(outletPipe);

    // 添加标签
    const sprite = this.createLabel(cooler.name);
    sprite.position.set(0, 4, 0); // 将标签放在冷却塔顶部上方
    group.add(sprite);

    // 设置整个组的位置
    group.position.set(cooler.x, cooler.y, cooler.z);

    return group;
  }

  createStandardCoolerMesh(cooler) {
    // 将原来的换热器模型代码移到这个方法中
    const group = new THREE.Group();

    // 创建壳体（圆柱体）
    const shellRadius = 0.3;
    const shellLength = 1.5;
    const shellGeometry = new THREE.CylinderGeometry(shellRadius, shellRadius, shellLength, 32);
    const shellMaterial = new THREE.MeshPhongMaterial({
      color: 0x7B8994,
      metalness: 0.8,
      roughness: 0.5,
      transparent: false
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.rotation.z = Math.PI / 2;
    group.add(shell);

    // 创建两端的球体端盖
    const sphereRadius = shellRadius * 0.95;
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x7B8994,
      metalness: 0.8,
      roughness: 0.5,
      transparent: false
    });

    const leftSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    leftSphere.position.x = -shellLength/2;
    group.add(leftSphere);

    const rightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    rightSphere.position.x = shellLength/2;
    group.add(rightSphere);

    // 添加管口（小圆柱体）
    const nozzleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
    const nozzleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A4A4A,
      metalness: 0.7,
      roughness: 0.3,
      transparent: false
    });

    const topNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    topNozzle.position.set(0, 0.4, 0);
    group.add(topNozzle);

    const bottomNozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
    bottomNozzle.position.set(0, -0.4, 0);
    group.add(bottomNozzle);

    // 添加支架
    const supportGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const supportMaterial = new THREE.MeshPhongMaterial({
      color: 0x4A4A4A,
      metalness: 0.7,
      roughness: 0.3,
      transparent: false
    });

    const leftSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    leftSupport.position.set(-0.4, -0.5, 0);
    group.add(leftSupport);

    const rightSupport = new THREE.Mesh(supportGeometry, supportMaterial);
    rightSupport.position.set(0.4, -0.5, 0);
    group.add(rightSupport);

    // 添加标签
    const sprite = this.createLabel(cooler.name);
    sprite.position.set(0, 1.5, 0);
    group.add(sprite);

    // 设置整个组的位置
    group.position.set(cooler.x, cooler.y, cooler.z);

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
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.6
    });
    
    const pipe = new THREE.Mesh(geometry, material);
    
    // 将管道旋转到正确的方向
    pipe.position.copy(start);
    pipe.position.addScaledVector(direction, 0.5);
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

    // 添加用户数据属性
    pipe.userData.type = 'flow';
    
    return pipe;
  }

  addCooler(cooler) {
    const mesh = this.createCoolerMesh(cooler);
    mesh.userData = {
      inTemp: cooler.inTemp,
      outTemp: cooler.outTemp
    };
    this.scene.add(mesh);
    this.coolers.set(cooler.name, mesh);
    
    // 更新场景中心点
    this.updateSceneCenter();
  }

  createValveMesh(position) {
    const group = new THREE.Group();

    // 创建阀门主体（圆柱体）
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a90e2,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // 使阀门水平放置
    group.add(body);

    // 创建阀门手柄（立方体）
    const handleGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0xff4444,
      metalness: 0.5,
      roughness: 0.5
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = 0.3; // 将手柄放在阀门顶部
    group.add(handle);

    // 设置阀门位置
    group.position.copy(position);
    
    return group;
  }

  // 在给定点周围找到合适的汇合点
  findMergePoint(centerPoint, radius = 2) {
    // 尝试在 XZ 平面上找一个合适的点
    const angle = Math.random() * Math.PI * 2; // 随机角度
    const x = centerPoint.x + Math.cos(angle) * radius;
    const z = centerPoint.z + Math.sin(angle) * radius;
    return new THREE.Vector3(x, centerPoint.y, z);
  }

  addFlow(flow) {
    const { name, sources, path, destinations } = flow;
    const pipes = new THREE.Group();
    
    pipes.userData = {
      type: 'flow',
      flowName: name,
      // 预留温度和流量信息
      startTemp: null,
      endTemp: null,
      flowRate: null
    };

    // 1. 首先生成所有管道路径点
    let pathPoints = [];
    let currentTemp = null; // 初始化currentTemp
    
    // 如果有多个起始点，需要计算汇合点
    let mergePoint = null;
    if (sources.length > 1) {
      // 计算所有起始点的中心位置作为汇合点
      const center = new THREE.Vector3();
      let totalStartTemp = 0;
      sources.forEach(sourceName => {
        const sourceCooler = this.coolers.get(sourceName);
        if (sourceCooler) {
          center.add(sourceCooler.position);
          totalStartTemp += sourceCooler.outTemp; // 使用冷却器的出口温度
        }
      });
      center.divideScalar(sources.length);
      
      // 汇合点稍微偏移一点，避免与冷却器重叠
      mergePoint = new THREE.Vector3(
        center.x + 2,
        center.y,
        center.z
      );

      // 计算汇合后的平均温度（预留）
      currentTemp = totalStartTemp / sources.length;
      pipes.userData.startTemp = currentTemp;
    } else if (sources.length === 1) {
      const sourceCooler = this.coolers.get(sources[0]);
      if (sourceCooler) {
        currentTemp = sourceCooler.outTemp;
        pipes.userData.startTemp = currentTemp;
      }
    }

    // 如果有多个终点，需要计算分散点
    let splitPoint = null;
    if (destinations.length > 1) {
      // 计算所有终点的中心位置作为分散点
      const center = new THREE.Vector3();
      destinations.forEach(destName => {
        const destCooler = this.coolers.get(destName);
        if (destCooler) {
          center.add(destCooler.position);
        }
      });
      center.divideScalar(destinations.length);
      
      // 分散点稍微偏移一点，避免与冷却器重叠
      splitPoint = new THREE.Vector3(
        center.x - 2,
        center.y,
        center.z
      );
    }

    // 2. 生成起始点到汇合点的管道
    if (sources.length > 0) {
      sources.forEach(sourceName => {
        const sourceCooler = this.coolers.get(sourceName);
        if (sourceCooler) {
          // 确定目标点（汇合点或第一个途径点或唯一终点）
          let targetPoint;
          if (mergePoint) {
            targetPoint = mergePoint;
          } else if (path.length > 0) {
            const firstPathCooler = this.coolers.get(path[0]);
            targetPoint = firstPathCooler.position;
          } else if (destinations.length === 1) {
            const destCooler = this.coolers.get(destinations[0]);
            targetPoint = destCooler.position;
          }

          if (targetPoint) {
            const points = this.createAxisAlignedPath(
              sourceCooler.position.clone(),
              targetPoint.clone()
            );
            points.forEach((point, i) => {
              if (i < points.length - 1) {
                const pipe = this.createFlowPipe(points[i], points[i + 1]);
                pipe.userData = {
                  ...pipes.userData,
                  startTemp: sourceCooler.outTemp,
                  endTemp: mergePoint ? currentTemp : null
                };
                pipes.add(pipe);
              }
            });
          }
        }
      });

      // 如果有汇合点，添加阀门
      if (mergePoint) {
        const valve = this.createValveMesh(mergePoint);
        pipes.add(valve);
      }
    }

    // 3. 生成主路径管道
    let startPoint = mergePoint || 
      (sources.length === 1 ? this.coolers.get(sources[0]).position.clone() : null);
    
    if (startPoint) {
      let currentPoint = startPoint.clone();
      
      // 连接所有途径点
      for (let i = 0; i < path.length; i++) {
        const pathCooler = this.coolers.get(path[i]);
        if (pathCooler) {
          const points = this.createAxisAlignedPath(
            currentPoint,
            pathCooler.position.clone()
          );
          points.forEach((point, i) => {
            if (i < points.length - 1) {
              const pipe = this.createFlowPipe(points[i], points[i + 1]);
              pipe.userData = {
                ...pipes.userData,
                startTemp: currentTemp,
                endTemp: pathCooler.inTemp
              };
              pipes.add(pipe);
            }
          });
          currentPoint = pathCooler.position.clone();
          currentTemp = pathCooler.outTemp;
        }
      }

      // 连接到分散点或最终目标
      let endPoint = splitPoint;
      if (!endPoint && destinations.length === 1) {
        const destCooler = this.coolers.get(destinations[0]);
        endPoint = destCooler.position.clone();
      }

      if (endPoint && currentPoint) {
        const points = this.createAxisAlignedPath(currentPoint, endPoint);
        points.forEach((point, i) => {
          if (i < points.length - 1) {
            const pipe = this.createFlowPipe(points[i], points[i + 1]);
            pipe.userData = {
              ...pipes.userData,
              startTemp: currentTemp,
              endTemp: splitPoint ? currentTemp : null
            };
            pipes.add(pipe);
          }
        });
      }
    }

    // 4. 生成分散点到终点的管道
    if (splitPoint && destinations.length > 1) {
      // 添加分散点阀门
      const valve = this.createValveMesh(splitPoint);
      pipes.add(valve);

      const splitTemp = currentTemp || pipes.userData.startTemp; // 使用当前温度或起始温度
      destinations.forEach(destName => {
        const destCooler = this.coolers.get(destName);
        if (destCooler) {
          const points = this.createAxisAlignedPath(
            splitPoint.clone(),
            destCooler.position.clone()
          );
          points.forEach((point, i) => {
            if (i < points.length - 1) {
              const pipe = this.createFlowPipe(points[i], points[i + 1]);
              pipe.userData = {
                type: 'flow',
                flowName: `${name}-to-${destName}`,
                startTemp: splitTemp,
                endTemp: destCooler.inTemp,
                flowRate: null // 预留流量信息
              };
              pipes.add(pipe);
            }
          });
        }
      });
    }

    this.scene.add(pipes);
    this.flows.set(name, pipes);
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

    // 如果有足够的点，创建管道
    if (points.length >= 2) {
      const pipes = new THREE.Group();
      
      // 为管道添加用户数据
      pipes.userData = {
        type: 'hotFlow',
        flowName: name,
        inletTemp,
        outletTemp,
        mcp,
        heatCapacity,
        flowRate,
        coolers: coolerNames // 确保存储冷却器名称列表
      };
      
      // 为每对相邻点创建管道段
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        
        // 创建按x->y->z顺序的路径点
        const pathPoints = this.createAxisAlignedPath(start, end);
        
        // 创建每段管道
        for (let j = 0; j < pathPoints.length - 1; j++) {
          const pipe = this.createHotFlowPipe(pathPoints[j], pathPoints[j + 1]);
          pipe.userData = { ...pipes.userData }; // 复制所有用户数据到管道段
          pipes.add(pipe);
        }
      }
      
      //this.scene.add(pipes); 热流不需要在三维视图中展示管道
      this.hotFlows.set(name, pipes);
    }
  }

  createAxisAlignedPath(start, end) {
    const points = [start.clone()];
    const current = start.clone();
    
    // 按x->y->z的顺序创建路径点
    // X轴方向
    if (Math.abs(end.x - start.x) > 0.1) {
      current.x = end.x;
      points.push(current.clone());
    }
    
    // Y轴方向
    if (Math.abs(end.y - start.y) > 0.1) {
      current.y = end.y;
      points.push(current.clone());
    }
    
    // Z轴方向
    if (Math.abs(end.z - start.z) > 0.1) {
      current.z = end.z;
      points.push(current.clone());
    }
    
    return points;
  }

  createHotFlowPipe(start, end) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff4444,
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
      ...Array.from(this.coolers.values()),  // 优先检查冷却器
      ...Array.from(this.flows.values()),
      ...Array.from(this.hotFlows.values())
    ].flatMap(obj => {
      if (obj instanceof THREE.Group) {
        return [...obj.children];
      }
      return [obj];
    });

    // 检测相交
    const intersects = this.raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      let data = null;
      let type = '';
      let coolerName = '';

      // 查找相交对象所属的冷却器或流股
      for (const [name, cooler] of this.coolers) {
        if (cooler === intersectedObject || (cooler instanceof THREE.Group && cooler.children.includes(intersectedObject))) {
          data = this.getCoolerData(name);
          type = 'cooler';
          coolerName = name;
          break;
        }
      }

      // 如果不是冷却器，检查是否是流股
      if (!data) {
        for (const [name, flow] of this.flows) {
          if (flow.children.includes(intersectedObject)) {
            type = 'flow';
            data = intersectedObject.userData;
            break;
          }
        }
      }

      if (data) {
        // 更新提示框位置
        const screenPosition = intersects[0].point.clone();
        screenPosition.project(this.camera);

        const x = (screenPosition.x * 0.5 + 0.5) * this.container.clientWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * this.container.clientHeight;

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
        this.tooltip.style.display = 'block';

        // 安全地格式化温度值
        const formatTemp = (temp) => {
          return temp !== null && temp !== undefined ? temp.toFixed(1) : '待计算';
        };

        if (type === 'cooler') {
          // 获取相关热流股信息
          const relatedHotFlows = this.getRelatedHotFlows(coolerName);
          
          let tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 8px;">冷却器: ${data.name}</div>
            <div style="margin-bottom: 12px;">冷却水温度: ${formatTemp(data.inTemp)}°C → ${formatTemp(data.outTemp)}°C</div>
          `;

          // 添加相关热流股信息
          if (relatedHotFlows.length > 0) {
            tooltipContent += `
              <div style="font-weight: bold; margin-bottom: 8px; color: #ff4444;">经过该冷却器的热流股:</div>
              <div style="max-height: 200px; overflow-y: auto;">
            `;
            
            relatedHotFlows.forEach(hotFlow => {
              tooltipContent += `
                <div style="margin-left: 12px; margin-bottom: 12px; border-left: 2px solid #ff4444; padding-left: 8px;">
                  <div style="font-weight: bold;">${hotFlow.name}</div>
                  <div style="color: #666;">入口温度: ${formatTemp(hotFlow.inletTemp)}°C</div>
                  <div style="color: #666;">出口温度: ${formatTemp(hotFlow.outletTemp)}°C</div>
                  <div style="color: #666;">MCP: ${formatTemp(hotFlow.mcp)} kJ/℃·h</div>
                  <div style="color: #666;">流速: ${formatTemp(hotFlow.flowRate)} kg/h</div>
                </div>
              `;
            });
            
            tooltipContent += `</div>`;
          } else {
            tooltipContent += `
              <div style="color: #666; font-style: italic;">没有热流股经过该冷却器</div>
            `;
          }

          this.tooltip.innerHTML = tooltipContent;
        } else if (type === 'flow') {
          // 显示流股信息
          let tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 8px;">冷却水流股: ${data.flowName}</div>
          `;

          if (data.startTemp !== null && data.startTemp !== undefined) {
            tooltipContent += `<div style="color: #666;">起始温度: ${formatTemp(data.startTemp)}°C</div>`;
          } else {
            tooltipContent += `<div style="color: #666;">起始温度: 待计算</div>`;
          }

          if (data.endTemp !== null && data.endTemp !== undefined) {
            tooltipContent += `<div style="color: #666;">终端温度: ${formatTemp(data.endTemp)}°C</div>`;
          } else {
            tooltipContent += `<div style="color: #666;">终端温度: 待计算</div>`;
          }

          if (data.flowRate !== null && data.flowRate !== undefined) {
            tooltipContent += `<div style="color: #666;">流量: ${formatTemp(data.flowRate)} kg/h</div>`;
          } else {
            tooltipContent += `<div style="color: #666;">流量: 待计算</div>`;
          }

          this.tooltip.innerHTML = tooltipContent;
        }

        this.tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.tooltip.style.color = 'white';
        this.tooltip.style.padding = '12px';
        this.tooltip.style.borderRadius = '6px';
        this.tooltip.style.fontSize = '14px';
        this.tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        this.tooltip.style.minWidth = '200px';
        this.tooltip.style.maxWidth = '300px';
      } else {
        this.tooltip.style.display = 'none';
      }
    } else {
      this.tooltip.style.display = 'none';
    }
  }

  getFlowData(flowName, type = 'flow') {
    console.log('Getting flow data:', flowName, type);  // Debug log
    if (type === 'hotFlow') {
      const hotFlow = this.hotFlows.get(flowName);
      console.log('Found hot flow:', hotFlow);  // Debug log
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
    console.log('Getting cooler data:', coolerName);  // Debug log
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
    console.log('Getting relateed hot flow: cood flow', coolerName);  // Debug log
    // 遍历所有热流股
    this.hotFlows.forEach((hotFlow, name) => {
      // 获取热流股的原始数据
      const userData = hotFlow.userData;
      console.log('Getting relateed hot flow: cood flow', userData.coolers);  // Debug log
      
      // 检查该热流股是否经过指定的冷却器
      if (userData && Array.isArray(userData.coolers) && userData.coolers.includes(coolerName)) {
        relatedHotFlows.push({
          name: name,
          inletTemp: userData.inletTemp,
          outletTemp: userData.outletTemp,
          mcp: userData.mcp,
          flowRate: userData.flowRate,
          heatCapacity: userData.heatCapacity
        });
      }
    });
    
    return relatedHotFlows;
  }
}