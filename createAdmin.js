const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/user');
require('dotenv').config(); // load env

// function for invisible password (like sudo command requesting pw)
const askHiddenPassword = (query) => {
    return new Promise((resolve) => {
        process.stdout.write(query);
        process.stdin.setRawMode(true); // hide input characters
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        let password = '';

        const listener = (char) => {
            char = char.toString();
            
            switch (char) {
                case "\n":
                case "\r":
                case "\u0004":
                    // on enter press -> reset terminal and return password
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', listener);
                    process.stdout.write('\n'); // add a newline so next logs appear on new line
                    resolve(password);
                    break;
                case "\u0003":
                    // exit on ctrl + c
                    process.stdout.write('\n');
                    process.exit();
                    break;
                case "\u007f": // backspace (linux)
                case "\u0008": // backspace (windows)
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                    }
                    break;
                default:
                    if (char.length === 1 && char.charCodeAt(0) >= 32) {
                        password += char;
                    }
                    break;
            }
        };

        process.stdin.on('data', listener);
    });
};

const createAdmin = async () => {
    try {
        // connect to mongodb
        const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nodejs';
        await mongoose.connect(dbUri);
        console.log('Connected to MongoDB...');

        // prompt for pw (invisible)
        const password = await askHiddenPassword('Enter admin password: ');
        
        if (!password) {
            console.log('Operation cancelled: Password cannot be empty.');
            return;
        }

        // hash and save
        const hashedPassword = await bcrypt.hash(password, 10);

        const adminUser = new User({
            id: 'admin',
            password: hashedPassword,
            roles: ['user', 'admin'] 
        });

        await adminUser.save();
        console.log('Admin user created successfully!');

    } catch (e) {
        console.log('Error:', e.message);
        if (e.code === 11000) {
            console.log('(This usually means the "admin" user already exists)');
        }
    } finally {
        mongoose.connection.close();
    }
};

createAdmin();