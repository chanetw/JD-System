
require('dotenv').config();
const { User, Role } = require('../src/v2/models'); // Adjust path as needed
const { getDatabase } = require('../src/config/database');

async function checkUserRole() {
    try {
        const sequelize = await getDatabase();
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const user = await User.findOne({
            where: { email: 'admin@test.com' },
            include: [{ model: Role, as: 'role' }]
        });

        if (user) {
            console.log(`User found: ${user.email}`);
            console.log(`Role: ${user.role ? user.role.name : 'No Role Assigned'}`);
            console.log(`Role ID: ${user.roleId}`);
        } else {
            console.log('User admin@test.com not found');
        }

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        process.exit();
    }
}

checkUserRole();
