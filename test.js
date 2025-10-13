const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const print_hashed = async (password) => {
    const hashed = await hashPassword(password);
    console.log(`Hashed password for "${password}": ${hashed}`);
}

print_hashed("admin");