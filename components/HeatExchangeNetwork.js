export class HeatExchangeNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.margin = { top: 50, right: 200, bottom: 150, left: 100 };
        this.width = canvas.width - this.margin.left - this.margin.right;
        this.height = canvas.height - this.margin.top - this.margin.bottom;
        
        // 样式配置
        this.styles = {
            hotFlow: {
                color: '#ff4444',
                lineWidth: 2,
                arrowSize: 8
            },
            coolFlow: {
                color: '#3498db',
                lineWidth: 2,
                arrowSize: 8
            },
            cooler: {
                width: 30, 
                height: 20,
                color: '#7B8994'
            },
            dottedLine: {
                color: '#666666',
                lineWidth: 1,
                dash: [5, 5]
            },
            text: {
                font: '12px Arial',
                color: '#333333'
            },
            coolingTower: {
                width: 60,
                height: 80,
                color: '#7B8994'
            }
        };

        // 用于存储节点位置的映射
        this.coolerPositions = new Map();
        this.flowPositions = new Map();
        this.coolerXPositions = [];  // 存储所有冷却器的X坐标，按从右到左排序
        this.coolFlowYPositions = []; // 存储所有冷却水流的Y坐标
        this.middleY = 0;  // 存储水平主管道的纵坐标
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawText(text, x, y, options = {}) {
        const { align = 'left', baseline = 'middle', color = this.styles.text.color } = options;
        this.ctx.font = this.styles.text.font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }

    drawArrow(x, y, direction = 'right', style = this.styles.hotFlow) {
        const { arrowSize } = style;
        this.ctx.beginPath();
        this.ctx.fillStyle = style.color;
        
        if (direction === 'right') {
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - arrowSize, y - arrowSize/2);
            this.ctx.lineTo(x - arrowSize, y + arrowSize/2);
        } else if (direction === 'down') {
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - arrowSize/2, y - arrowSize);
            this.ctx.lineTo(x + arrowSize/2, y - arrowSize);
        } else if (direction === 'up') {
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - arrowSize/2, y + arrowSize);
            this.ctx.lineTo(x + arrowSize/2, y + arrowSize);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }

    calculateCoolerPositions(data) {
        const { hotFlows, coolFlows } = data;
        const allCoolers = new Set();
        const coolerOrder = new Map(); // 存储冷却器的顺序
        
        // 收集所有冷却器
        hotFlows.forEach(flow => {
            flow.coolers.forEach(cooler => allCoolers.add(cooler));
        });

        // 找到从冷却塔出来的第一个水流
        const initialFlow = coolFlows.find(f => f.sources.includes('冷却塔'));
        if (initialFlow) {
            // 按照水流路径顺序记录冷却器
            let order = 0;
            initialFlow.path.forEach(cooler => {
                if (!coolerOrder.has(cooler)) {
                    coolerOrder.set(cooler, order++);
                }
            });
        }

        // 处理其他水流中的冷却器
        coolFlows.forEach(flow => {
            if (!flow.sources.includes('冷却塔')) {
                flow.path.forEach(cooler => {
                    if (!coolerOrder.has(cooler)) {
                        coolerOrder.set(cooler, coolerOrder.size);
                    }
                });
            }
        });

        // 计算冷却器的X坐标
        const coolerCount = allCoolers.size;
        const spacing = this.canvas.width / (coolerCount + 1);
        console.log('冷却器间隔是', spacing,coolerCount,this.canvas.width,this.margin.right,this.margin.left);
        const positions = {};
        
        // 清空之前的X坐标数组
        this.coolerXPositions = [];
        
        // 根据顺序分配位置，从右到左
        Array.from(allCoolers).sort((a, b) => {
            const orderA = coolerOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
            const orderB = coolerOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        }).forEach((cooler, index) => {
            // 从右向左计算位置
            const x = this.canvas.width - this.margin.right - spacing * (index + 1);
            
            positions[cooler] = x;
            console.log('冷却器位置', positions);
            this.coolerXPositions.push(x);
        });

        // 对X坐标数组进行排序，从大到小（从右到左）
        this.coolerXPositions.sort((a, b) => b - a);

        return positions;
    }

    drawHotFlow(flow, y, index, coolerPositions) {
        const { name, inletTemp, outletTemp, coolers } = flow;
        const startX = this.margin.left;
        const endX = this.canvas.width - this.margin.right;
        
        // 绘制主流线
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.styles.hotFlow.color;
        this.ctx.lineWidth = this.styles.hotFlow.lineWidth;
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
        this.ctx.stroke();

        // 绘制箭头
        this.drawArrow(endX, y, 'right', this.styles.hotFlow);

        // 绘制温度标签
        this.drawText(`${inletTemp}°C`, startX - 25, y, { align: 'right' });
        this.drawText(`${outletTemp}°C`, endX + 10, y, { align: 'left' });
        this.drawText(name, startX - 70, y, { align: 'right' });

        return { y, coolers };
    }

    drawCooler(x, y) {
        const { width, height, color } = this.styles.cooler;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width/2, y - height/2, width, height);
    }

    drawCoolingTower(x, y) {
        const { width, height, color } = this.styles.coolingTower;
        
        // 绘制主体
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - width/2, y + height/2); // 左下
        this.ctx.lineTo(x + width/2, y + height/2); // 右下
        this.ctx.lineTo(x + width/3, y - height/2); // 右上
        this.ctx.lineTo(x - width/3, y - height/2); // 左上
        this.ctx.closePath();
        this.ctx.fill();

        // 绘制顶部风扇示意
        const fanWidth = width/3;
        for(let i = -1; i <= 1; i++) {
            this.ctx.beginPath();
            this.ctx.arc(x + i * fanWidth, y - height/2 + 10, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#333';
            this.ctx.fill();
        }
    }

    drawCoolFlow(flow, y, index, flowsData, coolerPositions) {
        const { name, sources, path, destinations } = flow;
        
        // 确定流的起点和终点
        let startX, endX;
        
        if (sources.includes('冷却塔')) {
            // 如果来自冷却塔，起点是第一个冷却器
            startX = coolerPositions[path[0]];
        } else {
            // 否则起点是sources中的第一个冷却器
            startX = coolerPositions[sources[0]];
        }

        if (destinations.includes('冷却塔')) {
            // 如果流向冷却塔，终点是最后一个冷却器
            const lastCooler = [...sources, ...path].filter(c => c !== '冷却塔').pop();
            endX = coolerPositions[lastCooler];
        } else {
            // 否则终点是destinations中的最后一个冷却器
            endX = coolerPositions[destinations[destinations.length - 1]];
        }

        // 绘制主水平流线
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.styles.coolFlow.color;
        this.ctx.lineWidth = this.styles.coolFlow.lineWidth;
        this.ctx.moveTo(startX, y);
        this.ctx.lineTo(endX, y);
        this.ctx.stroke();

        // 绘制流股名称
        this.drawText(name, Math.min(startX, endX) - 10, y, { align: 'right' });

        // 在冷却水流上绘制冷却器
        const coolers = [...(sources || []), ...(path || [])].filter(name => name !== '冷却塔');
        coolers.forEach(coolerName => {
            const x = coolerPositions[coolerName];
            this.drawCooler(x, y);
            this.coolerPositions.set(`${coolerName}_cool`, { x, y });
        });

        // 存储流的位置信息
        this.flowPositions.set(name, { startX, endX, y });

        return { y, sources, path, destinations };
    }

    calculateFlowSpacing(data) {
        const { hotFlows, coolFlows } = data;
        // 计算可用高度（画布高度减去冷却塔高度和边距）
        const availableHeight = this.canvas.height - this.margin.top - this.margin.bottom - this.styles.coolingTower.height;
        // 计算总流股数（热流 + 冷却水流）
        const totalFlows = hotFlows.length + coolFlows.length;
        // 计算间距
        return availableHeight / (totalFlows + 1);
    }

    calculateCoolFlowPositions(data, flowSpacing) {
        const { coolFlows } = data;
        this.coolFlowYPositions = [];
        
        // 找到从冷却塔出来的第一个水流
        const initialFlow = coolFlows.find(f => f.sources.includes('冷却塔'));
        if (!initialFlow) return;

        // 计算起始Y坐标（在热流之后）
        let startY = this.margin.top + (data.hotFlows.length + 1) * flowSpacing;
        
        // 首先处理初始水流
        let order = 0;
        this.coolFlowYPositions[order] = startY;
        
        // 递归处理水流路径
        const processFlow = (flow, order) => {
            if (!flow) return;
            // 为当前水流分配Y坐标
            this.coolFlowYPositions[order] = startY + order * flowSpacing;
            
            // 处理目标水流
            if (flow.destinations) {
                flow.destinations.forEach(dest => {
                    if (dest !== '冷却塔') {
                        const nextFlow = coolFlows.find(f => f.sources.includes(dest));
                        if (nextFlow) {
                            processFlow(nextFlow, order + 1);
                        }
                    }
                });
            }
        };

        // 从初始水流开始处理
        processFlow(initialFlow, 0);
        
        // 计算中心纵坐标
        this.middleY = (this.coolFlowYPositions[0] + this.coolFlowYPositions[this.coolFlowYPositions.length - 1]) / 2;
        
        return this.coolFlowYPositions;
    }

    drawWaterConnections(flows, towerX, towerY, coolerPositions) {
        const { color, lineWidth } = this.styles.coolFlow;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        // 处理从冷却塔出来的水流
        const initialFlow = flows.find(f => f.sources.includes('冷却塔'));
        if (initialFlow) {
            // 从冷却塔到画布最右端的水平线，然后到中心纵坐标
            this.drawWaterPath([
                { x: towerX, y: towerY - this.styles.coolingTower.height/2 },
                { x: towerX, y: this.middleY },
                { x: this.canvas.width - this.margin.right, y: this.middleY }
            ]);

            // 处理初始水流路径上的所有冷却器
            initialFlow.path.forEach((coolerName, index) => {
                const coolerX = coolerPositions[coolerName];
                const coolerPos = this.coolerPositions.get(`${coolerName}_cool`);
                if (coolerPos) {
                    // 从主水平管道连接到冷却器
                    this.drawWaterPath([
                        { x: coolerX, y: this.middleY },
                        { x: coolerX, y: coolerPos.y }
                    ]);
                }
            });
        }

        // 处理其他水流的连接
        flows.forEach(flow => {
            if (!flow.sources.includes('冷却塔')) {
                flow.path.forEach((coolerName, index) => {
                    const coolerX = coolerPositions[coolerName];
                    const coolerPos = this.coolerPositions.get(`${coolerName}_cool`);
                    if (coolerPos) {
                        // 从主水平管道连接到冷却器
                        this.drawWaterPath([
                            { x: coolerX, y: this.middleY },
                            { x: coolerX, y: coolerPos.y }
                        ]);
                    }
                });
            }
        });

        // 处理返回冷却塔的连接
        flows.forEach(flow => {
            if (flow.destinations.includes('冷却塔')) {
                const lastCooler = [...flow.sources, ...flow.path].filter(c => c !== '冷却塔').pop();
                const coolerPos = this.coolerPositions.get(`${lastCooler}_cool`);
                if (coolerPos) {
                    // 从最后一个冷却器返回到冷却塔汇合点
                    const returnPoint = { 
                        x: this.margin.left,  // 画布左边缘
                        y: this.middleY       // 水流中心纵坐标
                    };
                    this.drawWaterPath([
                        { x: coolerPos.x, y: coolerPos.y },
                        { x: coolerPos.x - this.styles.cooler.width/2 -10, y: coolerPos.y }, // 向左偏移5个单位
                        { x: returnPoint.x, y: returnPoint.y },  // 到达汇合点
                        { x: towerX, y: returnPoint.y },         // 水平到达冷却塔
                        { x: towerX, y: towerY + this.styles.coolingTower.height/2 }  // 连接到冷却塔
                    ]);
                }
            }
        });
    }

    drawWaterPath(points) {
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
        // 在最后一个点添加箭头
        const lastPoint = points[points.length - 1];
        const prevPoint = points[points.length - 2];
        const direction = lastPoint.y > prevPoint.y ? 'down' : 
                         lastPoint.y < prevPoint.y ? 'up' : 'right';
        this.drawArrow(lastPoint.x, lastPoint.y, direction, this.styles.coolFlow);
    }

    drawExchangerConnections() {
        // 绘制冷却器之间的虚线连接
        this.ctx.setLineDash(this.styles.dottedLine.dash);
        this.ctx.strokeStyle = this.styles.dottedLine.color;
        this.ctx.lineWidth = this.styles.dottedLine.lineWidth;

        // 遍历所有冷却水流
        this.originalData.coolFlows.forEach(coolFlow => {
            // 获取冷却水流上的所有冷却器
            const coolers = [...(coolFlow.sources || []), ...(coolFlow.path || [])].filter(name => name !== '冷却塔');
            
            coolers.forEach(coolerName => {
                // 找到这个冷却器在冷却水流上的位置
                const coolPos = this.coolerPositions.get(`${coolerName}_cool`);
                console.log('这股冷却水流', coolFlow.name, '的冷却器', coolers, '在冷却水流上的位置', coolPos);
                // 找到经过这个冷却器的热流
                const hotFlow = this.originalData.hotFlows.find(flow => 
                    flow.coolers && flow.coolers.includes(coolerName)
                );
                console.log('经过这个冷却器的热流', hotFlow, coolPos);
                if (hotFlow && coolPos) {
                    // 计算热流的纵坐标
                    const hotFlowIndex = this.originalData.hotFlows.indexOf(hotFlow);
                    const hotFlowY = this.margin.top + hotFlowIndex * this.calculateFlowSpacing(this.originalData);
                    console.log('热流的纵坐标', hotFlowY);
                    
                    // 绘制虚线连接
                    this.ctx.beginPath();
                    this.ctx.moveTo(coolPos.x, coolPos.y);
                    this.ctx.lineTo(coolPos.x, hotFlowY);
                    this.ctx.stroke();
                }
            });
        });

        this.ctx.setLineDash([]); // 重置虚线样式
    }

    draw(data) {
        this.clear();
        this.coolerPositions.clear();
        this.flowPositions.clear();
        this.originalData = data; // 保存原始数据以供后续使用
        console.log('原始数据', this.originalData);
        const { hotFlows, coolFlows } = data;
        console.log('热流股', hotFlows);
        console.log('冷流股', coolFlows);
        
        // 1. 计算流股间距
        const flowSpacing = this.calculateFlowSpacing(data);
        
        // 2. 计算冷却器间距和位置
        const allCoolers = new Set();
        coolFlows.forEach(flow => {
            [...(flow.sources || []), ...(flow.path || [])].forEach(cooler => {
                if (cooler !== '冷却塔') {
                    allCoolers.add(cooler);
                }
            });
        });
        const totalSections = allCoolers.size + 3; // 冷却器数量 + 3
        const sectionWidth = (this.canvas.width - this.margin.left - this.margin.right - 10) / totalSections;
        
        // 计算所有冷却器的横坐标（从右到左）
        const coolerXPositions = [];
        for (let i = 1; i <= allCoolers.size; i++) {
            coolerXPositions.push(this.canvas.width - this.margin.right - i * sectionWidth);
        }
        console.log('冷却器横坐标集合', coolerXPositions);
        
        // 3. 绘制热流股
        let y = this.margin.top;
        hotFlows.forEach((flow, index) => {
            this.drawHotFlow(flow, y, index, this.coolerPositions);
            y += flowSpacing;
        });

        // 4. 绘制冷却塔
        const towerX = this.canvas.width/2;
        const towerY = this.canvas.height - this.margin.bottom;
        this.drawCoolingTower(towerX, towerY);

        // 5. 计算冷却水流的起始坐标和终点坐标以及冷却器在冷却水流上的坐标
        const coolingFlowCoordinates = this.calculateCoolingFlowCoordinates(data, flowSpacing, towerX, towerY, coolerXPositions);

        // 6. 绘制冷却水流
        this.drawCoolingFlows(coolingFlowCoordinates);

        // 7. 绘制冷却器
        this.drawCoolers(coolingFlowCoordinates,flowSpacing);

        // 8. 绘制热流和冷却水流之间冷却器的虚线
        this.drawExchangerConnections();
    }

    calculateCoolingFlowCoordinates(data, flowSpacing, towerX, towerY, coolerXPositions) {
        const { hotFlows, coolFlows } = data;
        const coordinates = {
            flowYPositions: [], // 存储冷却水流的纵坐标集合
            sourcePoint: null,  // 冷却水流源头坐标
            sinkPoint: null,    // 冷却水流汇合点坐标
            flows: new Map(),   // 存储每个冷却水流的坐标信息
            availableXPositions: [...coolerXPositions], // 可用的冷却器横坐标
            processedCoolers: new Set() // 记录已处理的冷却器
        };

        // (1) 计算冷却水流纵坐标的取值范围
        const lastHotFlowY = this.margin.top + (hotFlows.length - 1) * flowSpacing;
        for (let i = 0; i < coolFlows.length; i++) {
            coordinates.flowYPositions.push(lastHotFlowY + (i + 1) * flowSpacing);
        }

        // (2) 计算冷却水流源头和汇合点
        const sourceY = (lastHotFlowY + towerY - this.styles.coolingTower.height/2) / 2;
        coordinates.sourcePoint = {
            x: this.canvas.width - this.margin.right,
            y: sourceY
        };
        coordinates.sinkPoint = {
            x: this.margin.left,
            y: sourceY
        };
        console.log('冷却水流源头和汇合点', coordinates.sourcePoint, coordinates.sinkPoint);

        // (3) 处理从冷却塔出来的水流
        const initialFlows = coolFlows.filter(flow => flow.sources.includes('冷却塔'));
        const availableYPositions = [...coordinates.flowYPositions];

        initialFlows.forEach(flow => {
            const y = this.findNearestY(sourceY, availableYPositions);
            const index = availableYPositions.indexOf(y);
            if (index > -1) {
                availableYPositions.splice(index, 1);
            }

            coordinates.flows.set(flow.name, {
                startPoint: {
                    x: coordinates.sourcePoint.x - 10,
                    y: y
                },
                endPoint: null,
                coolers: [],
                y: y
            });
        });

        // (4) 处理其他冷却水流
        const processFlow = (flow) => {
            console.log('处理冷却水流', flow.name);
            
            const flowData = coordinates.flows.get(flow.name);
            const coolers = [...(flow.sources || []), ...(flow.path || [])].filter(name => name !== '冷却塔');
            console.log('这股冷却水流', flow.name, '的冷却器', coolers);
            
            // 只为未处理的冷却器分配位置
            coolers.forEach(cooler => {
                if (!coordinates.processedCoolers.has(cooler)) {
                    // 找到离起点最近且在其左侧的横坐标
                    const nearestX = this.findNearestX(flowData.startPoint.x, coordinates.availableXPositions);
                    const index = coordinates.availableXPositions.indexOf(nearestX);
                    if (index > -1) {
                        coordinates.availableXPositions.splice(index, 1);
                    }
                    
                    flowData.coolers.push({
                        name: cooler,
                        x: nearestX,
                        y: flowData.y
                    });
                    coordinates.processedCoolers.add(cooler);
                } else {
                    // 如果冷却器已处理，找到它的位置并添加到当前流股
                    const existingCooler = Array.from(coordinates.flows.values())
                        .flatMap(f => f.coolers)
                        .find(c => c.name === cooler);
                    if (existingCooler) {
                        flowData.coolers.push({
                            name: cooler,
                            x: existingCooler.x,
                            y: flowData.y
                        });
                    }
                }
            });

            // 查找与其他流股共享的终点冷却器
            const sharedDestinations = flow.destinations.filter(dest => 
                dest !== '冷却塔' && 
                coolFlows.some(otherFlow => 
                    otherFlow !== flow && 
                    otherFlow.destinations.includes(dest)
                )
            );

            if (sharedDestinations.length > 0) {
                console.log('这股冷却水流', flow.name, '的共享终点冷却器', sharedDestinations);
                
                // 找到所有共享终点冷却器的冷却水流
                const sharedFlows = coolFlows.filter(otherFlow => 
                    otherFlow !== flow && 
                    otherFlow.destinations.some(dest => sharedDestinations.includes(dest))
                );
                console.log('共享终点冷却器的冷却水流', sharedFlows.map(f => f.name));

                // 收集所有相关冷却器的位置
                const lastCoolers = [];
                
                // 处理已存在的流股
                sharedFlows.forEach(sharedFlow => {
                    const sharedFlowData = coordinates.flows.get(sharedFlow.name);
                    if (sharedFlowData) {
                        // 如果流股已处理，直接使用其最后一个冷却器
                        const lastCooler = sharedFlowData.coolers[sharedFlowData.coolers.length - 1];
                        if (lastCooler) {
                            lastCoolers.push(lastCooler);
                        }
                    } else {
                        // 如果流股未处理，先为其分配冷却器位置
                        const coolers = [...(sharedFlow.sources || []), ...(sharedFlow.path || [])].filter(name => name !== '冷却塔');
                        const tempFlowData = {
                            coolers: []
                        };
                        
                        coolers.forEach(cooler => {
                            if (!coordinates.processedCoolers.has(cooler)) {
                                const nearestX = this.findNearestX(flowData.startPoint.x, coordinates.availableXPositions);
                                const index = coordinates.availableXPositions.indexOf(nearestX);
                                if (index > -1) {
                                    coordinates.availableXPositions.splice(index, 1);
                                }
                                
                                tempFlowData.coolers.push({
                                    name: cooler,
                                    x: nearestX,
                                    y: 0 // 纵坐标暂不设置
                                });
                                coordinates.processedCoolers.add(cooler);
                            } else {
                                const existingCooler = Array.from(coordinates.flows.values())
                                    .flatMap(f => f.coolers)
                                    .find(c => c.name === cooler);
                                if (existingCooler) {
                                    tempFlowData.coolers.push({
                                        name: cooler,
                                        x: existingCooler.x,
                                        y: 0 // 纵坐标暂不设置
                                    });
                                }
                            }
                        });
                        
                        // 使用最后一个冷却器的位置
                        const lastCooler = tempFlowData.coolers[tempFlowData.coolers.length - 1];
                        if (lastCooler) {
                            lastCoolers.push(lastCooler);
                        }
                    }
                });

                // 找到最左边的冷却器
                if (lastCoolers.length > 0) {
                    const leftmostCooler = lastCoolers.reduce((leftmost, current) => 
                        current.x < leftmost.x ? current : leftmost
                    );

                    // 设置终点
                    flowData.endPoint = {
                        x: leftmostCooler.x - this.styles.cooler.width/2 - 10,
                        y: flowData.y
                    };
                } else {
                    // 如果没有找到任何冷却器，使用当前流股的最后一个冷却器
                    const lastCooler = flowData.coolers[flowData.coolers.length - 1];
                    flowData.endPoint = {
                        x: lastCooler.x - this.styles.cooler.width/2 - 10,
                        y: flowData.y
                    };
                }
            } else {
                // 如果没有共享终点，使用当前流股的最后一个冷却器
                const lastCooler = flowData.coolers[flowData.coolers.length - 1];
                flowData.endPoint = {
                    x: lastCooler.x - this.styles.cooler.width/2 - 10,
                    y: flowData.y
                };
            }
            
            console.log('这股冷却水流', flow.name, '的起点', flowData.startPoint, '的终点', flowData.endPoint);

            // 处理分流
            if (flow.destinations) {
                flow.destinations.forEach(dest => {
                    if (dest !== '冷却塔') {
                        const nextFlow = coolFlows.find(f => f.sources.includes(dest));
                        if (nextFlow) {
                            if (!coordinates.flows.has(nextFlow.name)) {
                                const y = this.findNearestY(flowData.endPoint.y, availableYPositions);
                                const index = availableYPositions.indexOf(y);
                                if (index > -1) {
                                    availableYPositions.splice(index, 1);
                                }
                
                                coordinates.flows.set(nextFlow.name, {
                                    startPoint: {
                                        x: flowData.endPoint.x - 20,
                                        y: y
                                    },
                                    endPoint: null,
                                    coolers: [],
                                    y: y
                                });
                                processFlow(nextFlow);
                                console.log('设置冷却水流起点', coordinates.flows.get(nextFlow.name));
                            }
                        }
                    }
                });
            }
        };

        // 从初始水流开始处理
        initialFlows.forEach(flow => processFlow(flow));

        return coordinates;
    }

    findNearestX(targetX, availableXPositions) {
        return availableXPositions.reduce((nearest, current) => {
            // 只考虑在目标点左侧的坐标
            if (current >= targetX) return nearest;
            return Math.abs(current - targetX) < Math.abs(nearest - targetX) ? current : nearest;
        }, -Infinity);
    }

    findNearestY(targetY, availableYPositions) {
        return availableYPositions.reduce((nearest, current) => {
            return Math.abs(current - targetY) < Math.abs(nearest - targetY) ? current : nearest;
        });
    }

    drawCoolingFlows(coordinates) {
        const { color, lineWidth } = this.styles.coolFlow;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        // 绘制从冷却塔到冷却水流源头的连接
        this.drawCoolingTowerToSource(coordinates);

        // 绘制所有冷却水流
        coordinates.flows.forEach((flowData, flowName) => {
            // 绘制主水平流线
            this.ctx.beginPath();
            this.ctx.moveTo(flowData.startPoint.x, flowData.startPoint.y);
            this.ctx.lineTo(flowData.endPoint.x, flowData.endPoint.y);
            this.ctx.stroke();

            // 绘制流股名称，左移并上移，确保文字超过冷却器1/2高度
            this.drawText(flowName, flowData.startPoint.x - 10, flowData.startPoint.y - 15, { align: 'right' });

            // 绘制箭头
            this.drawArrow(flowData.endPoint.x, flowData.endPoint.y, 'left', this.styles.coolFlow);
        });

        // 绘制从汇合点到冷却塔的连接
        this.drawSinkToCoolingTower(coordinates);

        // 绘制流股之间的连接线
        this.drawFlowConnections(coordinates);
    }

    drawCoolingTowerToSource(coordinates) {
        const { color, lineWidth } = this.styles.coolFlow;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        // 获取冷却塔位置
        const towerX = this.canvas.width/2;
        const towerY = this.canvas.height - this.margin.bottom;

        // 绘制从冷却塔到画布右端的水平线,从偏移10个单位开始绘制线
        this.ctx.beginPath();
        this.ctx.moveTo(towerX + this.styles.coolingTower.width/2 -4, towerY - this.styles.coolingTower.height/2 + 10);
        this.ctx.lineTo(this.canvas.width - this.margin.right, towerY - this.styles.coolingTower.height/2 + 10);
        this.ctx.stroke();

        // 绘制从画布右端到冷却水流源头的垂直线
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - this.margin.right, towerY - this.styles.coolingTower.height/2 + 10);
        this.ctx.lineTo(this.canvas.width - this.margin.right, coordinates.sourcePoint.y);
        this.ctx.stroke();

        // 从冷却塔出来一小段距离绘制箭头
        this.drawArrow(this.canvas.width - this.margin.right -5, coordinates.sourcePoint.y, 'left', this.styles.coolFlow);
        this.drawArrow(towerX + this.styles.coolingTower.width/2 +20, towerY - this.styles.coolingTower.height/2 + 10, 'right', this.styles.coolFlow);
    }

    drawSinkToCoolingTower(coordinates) {
        const { color, lineWidth } = this.styles.coolFlow;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        // 获取冷却塔位置
        const towerX = this.canvas.width/2;
        const towerY = this.canvas.height - this.margin.bottom;

        // 绘制从汇合点到画布底端的垂直线
        this.ctx.beginPath();
        this.ctx.moveTo(coordinates.sinkPoint.x, coordinates.sinkPoint.y);
        this.ctx.lineTo(coordinates.sinkPoint.x, towerY);
        this.ctx.stroke();

        // 绘制从画布底端到冷却塔左端的水平线
        this.ctx.beginPath();
        this.ctx.moveTo(coordinates.sinkPoint.x, towerY);
        this.ctx.lineTo(towerX - this.styles.coolingTower.width/2, towerY);
        this.ctx.stroke();

        // 绘制箭头
        this.drawArrow(towerX - this.styles.coolingTower.width/2, towerY, 'right', this.styles.coolFlow);
    }

    drawFlowConnections(coordinates) {
        const { color, lineWidth } = this.styles.coolFlow;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        // 获取所有流股数据
        const flows = Array.from(coordinates.flows.entries());
        
        // 绘制从冷却水流源头到初始流股的连接
        const initialFlows = flows.filter(([_, flowData]) => 
            flowData.startPoint.x === coordinates.sourcePoint.x - 10
        );
        initialFlows.forEach(([_, flowData]) => {
            this.drawVerticalLine(coordinates.sourcePoint.x, coordinates.sourcePoint.y, flowData.startPoint.y);
            this.drawHorizontalLine(coordinates.sourcePoint.x, flowData.startPoint.x, flowData.startPoint.y);
        });

        // 处理每个流股的连接
        flows.forEach(([flowName, flowData]) => {
            // 获取当前流股的数据
            const flow = this.findFlowByName(flowName);
            if (!flow) return;

            if (flow.destinations.includes('冷却塔')) {
                // 如果终点是冷却塔，连接到汇合点
                this.drawVerticalLine(coordinates.sinkPoint.x, flowData.endPoint.y, coordinates.sinkPoint.y);
                this.drawHorizontalLine(flowData.endPoint.x, coordinates.sinkPoint.x, flowData.endPoint.y);
            } else {
                // 处理到其他流股的连接
                flow.destinations.forEach(dest => {
                    if (dest !== '冷却塔') {
                        // 找到以这个冷却器为起点的流股
                        const nextFlows = flows.filter(([nextFlowName, nextFlowData]) => {
                            const nextFlow = this.findFlowByName(nextFlowName);
                            console.log('这些流股是', nextFlow);
                            return nextFlow && nextFlow.sources.includes(dest);
                        });
                        console.log('这股流股', flow.name, '的终点', flowData.endPoint, '的下一个流股', nextFlows);
                        nextFlows.forEach(([_, nextFlowData]) => {
                            // 先绘制水平线
                            //const midY = (flowData.endPoint.y + nextFlowData.startPoint.y) / 2;
                            this.drawHorizontalLine(flowData.endPoint.x, nextFlowData.startPoint.x, flowData.endPoint.y);
                            
                            // 绘制水平线连接两个流股
                            
                            
                            // 后绘制垂直线
                            this.drawVerticalLine(nextFlowData.startPoint.x, nextFlowData.startPoint.y, flowData.endPoint.y);
                        });
                    }
                });
            }
        });
    }

    drawVerticalLine(x, y1, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y1);
        this.ctx.lineTo(x, y2);
        this.ctx.stroke();
    }

    drawHorizontalLine(x1, x2, y) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y);
        this.ctx.lineTo(x2, y);
        this.ctx.stroke();
    }

    findFlowByName(flowName) {
        // 在原始数据中查找流股
        const flow = this.originalData.coolFlows.find(f => f.name === flowName);
        return flow;
    }

    drawCoolers(coordinates,flowSpacing) {
        const { hotFlows } = this.originalData;
        
        // 绘制冷却水流上的冷却器
        coordinates.flows.forEach((flowData, flowName) => {
            flowData.coolers.forEach(cooler => {
                // 绘制冷却水流上的冷却器
                this.drawCooler(cooler.x, cooler.y, cooler.name);
                
                // 存储冷却器在冷却水流上的位置
                this.coolerPositions.set(`${cooler.name}_cool`, { x: cooler.x, y: cooler.y });
                
                // 找到经过这个冷却器的热流
                const relatedHotFlow = hotFlows.find(flow => 
                    flow.coolers && flow.coolers.includes(cooler.name)
                );
                console.log('这股冷却水流', flowName, '的冷却器', cooler, '经过这个冷却器的热流', relatedHotFlow);
                if (relatedHotFlow) {
                    // 计算热流的纵坐标
                    const hotFlowIndex = hotFlows.indexOf(relatedHotFlow);
                    const hotFlowY = this.margin.top + hotFlowIndex * flowSpacing;
                    console.log('热流', hotFlowIndex, '的纵坐标', hotFlowY,'间距', flowSpacing);
                    // 在热流上绘制相同的冷却器
                    this.drawCooler(cooler.x, hotFlowY, cooler.name);
                    
                    // 存储冷却器在热流上的位置
                    this.coolerPositions.set(`${cooler.name}_hot`, { x: cooler.x, y: hotFlowY });
                }
            });
        });
    }
}
