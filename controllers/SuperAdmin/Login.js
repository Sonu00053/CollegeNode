const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// const bcrypt = require('bcryptjs');




exports.loginView = (req, res) => {
    const token = req.cookies.token;
    if (token) {
        return res.redirect(`${global.CONSTANTS.super}index`);
    }
    View.Sview(res, 'login');
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.getSingleRecord('admins', { email: email,password: password}, '*');

        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'Invalid Credentials '
            });
        }
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 🔥 SET COOKIE (IMPORTANT)
        const COOKIE_MAX_AGE = Number(process.env.COOKIE_MAX_AGE) || 172800000;

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // production me true (HTTPS)
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE // 1 day
        });

        return res.json({
            status: true,
            message: 'Login Successful',
            redirect: '/super/index'
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};
