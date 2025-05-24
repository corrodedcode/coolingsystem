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
    
    this.init();
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
    this.coolers.clear();
    this.flows.clear();
  }

  createCoolerMesh(cooler) {
    // 创建冷却器的3D模型
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // 设置位置
    mesh.position.set(cooler.x, cooler.y, cooler.z);
    
    // 添加标签
    const sprite = this.createLabel(cooler.name);
    sprite.position.set(0, 1.5, 0);
    mesh.add(sprite);
    
    return mesh;
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
    this.scene.add(mesh);
    this.coolers.set(cooler.name, mesh);
  }

  addFlow(flow) {
    const sourceCooler = this.coolers.get(flow.source);
    if (!sourceCooler) return;
    
    // 创建从源头到每个途径点的管道
    let lastPosition = sourceCooler.position;
    flow.path.forEach(pointName => {
      const pointCooler = this.coolers.get(pointName);
      if (pointCooler) {
        const pipe = this.createFlowPipe(lastPosition, pointCooler.position);
        this.scene.add(pipe);
        this.flows.set(flow.name + '_' + pointName, pipe);
        lastPosition = pointCooler.position;
      }
    });
    
    // 创建从最后一个途径点到终点的管道
    const destCooler = this.coolers.get(flow.destinations);
    if (destCooler) {
      const pipe = this.createFlowPipe(lastPosition, destCooler.position);
      this.scene.add(pipe);
      this.flows.set(flow.name + '_dest', pipe);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}