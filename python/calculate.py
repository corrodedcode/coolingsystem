import sys
import json
import math

def calculate_heat_exchange(hot_flow):
    """计算热交换量"""
    mcp = hot_flow['mcp']  # kJ/℃·h
    inlet_temp = hot_flow['inletTemp']  # °C
    outlet_temp = hot_flow['outletTemp']  # °C
    
    # 计算热交换量 Q = mcp * ΔT
    heat_exchange = mcp * (inlet_temp - outlet_temp)  # kJ/h
    
    return heat_exchange

def calculate_efficiency(hot_flow, cooler):
    """计算换热效率"""
    hot_inlet = hot_flow['inletTemp']
    hot_outlet = hot_flow['outletTemp']
    cold_inlet = cooler['inTemp']
    
    # 计算效率 η = (th1 - th2)/(th1 - tc1)
    efficiency = (hot_inlet - hot_outlet)/(hot_inlet - cold_inlet)
    return efficiency * 100  # 转换为百分比

def process_data(data):
    """处理冷却系统数据"""
    results = {
        'hotFlows': {},
        'coolers': {}
    }
    
    # 处理每个热流股
    for hot_flow in data['hotFlows']:
        flow_name = hot_flow['name']
        results['hotFlows'][flow_name] = {
            'heatExchange': calculate_heat_exchange(hot_flow),
            'efficiencies': {}
        }
        
        # 计算与每个相关冷却器的效率
        for cooler_name in hot_flow['coolers']:
            cooler = next(
                (c for c in data['coolers'] if c['name'] == cooler_name),
                None
            )
            if cooler:
                efficiency = calculate_efficiency(hot_flow, cooler)
                results['hotFlows'][flow_name]['efficiencies'][cooler_name] = efficiency
    
    # 计算每个冷却器的总热负荷
    for cooler in data['coolers']:
        cooler_name = cooler['name']
        total_heat_load = 0
        
        # 查找使用这个冷却器的所有热流股
        for hot_flow in data['hotFlows']:
            if cooler_name in hot_flow['coolers']:
                # 假设热负荷在所有冷却器间平均分配
                n_coolers = len(hot_flow['coolers'])
                flow_heat = calculate_heat_exchange(hot_flow)
                total_heat_load += flow_heat / n_coolers
        
        results['coolers'][cooler_name] = {
            'totalHeatLoad': total_heat_load,
            'waterFlowRate': total_heat_load / (4.186 * (cooler['outTemp'] - cooler['inTemp']))  # kg/h
        }
    
    return results

def main():
    # 从标准输入读取JSON数据
    input_data = sys.stdin.read()
    data = json.loads(input_data)
    
    # 处理数据
    results = process_data(data)
    
    # 输出JSON结果
    print(json.dumps(results))

if __name__ == "__main__":
    main() 