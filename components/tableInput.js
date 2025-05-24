export function initTable(containerSelector, data) {
  const container = document.querySelector(containerSelector);
  // 简易表格：输入名称 + X/Y/Z
  container.innerHTML = `
    <table id="data-table">
      <thead><tr><th>设备</th><th>X</th><th>Y</th><th>Z</th></tr></thead>
      <tbody></tbody>
    </table>
    <button id="add-row">添加行</button>
  `;
  document.getElementById('add-row').onclick = () => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" placeholder="名称"></td>
      <td><input type="number"></td>
      <td><input type="number"></td>
      <td><input type="number"></td>
    `;
    document.querySelector('#data-table tbody').appendChild(row);
  };
}