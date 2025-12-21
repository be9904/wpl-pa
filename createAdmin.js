// execute once to manually create admin account
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user');

mongoose.connect('mongodb://127.0.0.1:27017/nodejs')
    .then(() => console.log('Connected...'))
    .catch(err => console.error(err));

const createAdmin = async () => {
    const password = '1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = new User({
        id: 'admin',
        password: hashedPassword,
        roles: ['user', 'admin'] 
    });

    try {
        await adminUser.save();
        console.log('Admin user created successfully!');
    } catch (e) {
        console.log('Error (User probably exists):', e.message);
    } finally {
        mongoose.connection.close();
    }
};

createAdmin();