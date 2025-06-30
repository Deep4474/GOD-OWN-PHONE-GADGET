const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, './users.json');

function loadUsers() {
  try {
    const data = fs.readFileSync(usersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

let users = loadUsers();

module.exports = { users, saveUsers }; 