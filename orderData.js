const fs = require('fs');
const path = require('path');

const ordersFilePath = path.join(__dirname, './orders.json');

function loadOrders() {
  try {
    const data = fs.readFileSync(ordersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}
function saveOrders(orders) {
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
}

let orders = loadOrders();

module.exports = { orders, saveOrders }; 