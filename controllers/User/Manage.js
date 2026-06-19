const path = require('path');

const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');

exports.dashboard = async (req, res) => {
    try {

        const student_id = req.user.student_id;

        const user = await UserModel.getSingleRecord(
            'students',
            { student_id },
            '*'
        );
        console.log(user);


        return View.Uview(res, 'index', {
            user: user,
            header:'User Dashboard'
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true
    });
    return res.redirect('/user/login');
};

exports.idcard = async (req, res) => {
    try {

        const student_id = req.user.student_id;

        const user = await UserModel.getSingleRecord(
            'students',
            { student_id },
            '*'
        );
        console.log(user);


        return View.Uview(res, 'idcard', {
            user: user,
            header:'Id Card'
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};