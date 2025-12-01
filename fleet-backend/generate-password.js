const bcrypt = require('bcryptjs');

const password = 'NavAdmin'; // Le mot de passe que vous voulez
const hash = bcrypt.hashSync(password, 10);

console.log('Mot de passe:', password);
console.log('Hash:', hash);

