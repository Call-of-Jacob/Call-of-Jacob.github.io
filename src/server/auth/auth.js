const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthSystem {
    static async registerUser(username, email, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return await User.create({
            username,
            email,
            password: hashedPassword
        });
    }

    static async loginUser(email, password) {
        const user = await User.findOne({ email });
        if (!user) throw new Error('User not found');

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) throw new Error('Invalid password');

        return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    }
}

module.exports = AuthSystem; 