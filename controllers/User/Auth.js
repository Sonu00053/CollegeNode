const path = require('path');

const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const jwt = require('jsonwebtoken');



exports.registerView = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../views/User/register.html')
    );
};

exports.register = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            dob,
            gender,
            father_name,
            father_mobile,
            mother_name,
            mobile,
            email,
            pincode,
            address,
            city,
            state,
            course,
            semester,
            password
        } = req.body;

        // Required Validation
        if (
            !first_name ||
            !last_name ||
            !dob ||
            !gender ||
            !father_name ||
            !father_mobile ||
            !mother_name ||
            !mobile ||
            !email ||
            !pincode||
            !address||
            !city||
            !state||
            !course ||
            !semester ||
            !password
        ) {
            return res.status(400).json({
                status: false,
                message: 'All required fields are mandatory'
            });
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: false,
                message: 'Invalid email address'
            });
        }

        // Mobile Validation
        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).json({
                status: false,
                message: 'Student mobile must be 10 digits'
            });
        }

        if (!/^[0-9]{10}$/.test(father_mobile)) {
            return res.status(400).json({
                status: false,
                message: 'Father mobile must be 10 digits'
            });
        }

        // Check Email Exists
        const existingUser = await UserModel.getSingleRecord(
            'students',
            { email },
            '*'
        );

        if (existingUser) {
            return res.status(400).json({
                status: false,
                message: 'Email already registered'
            });
        }

        const student_id = await exports.generateStaffId();
        const insertData = {
            student_id,
            first_name,
            last_name,
            dob,
            gender,
            father_name,
            father_mobile,
            mother_name,
            mobile,
            email,
            pincode,
            address,
            city,
            state,
            course,
            semester,
            password
        };

        const result = await UserModel.addRecord(
            'students',
            insertData
        );

        return res.status(200).json({
            status: true,
            message: 'Student Registered Successfully',
            student_id
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            status: false,
            message: 'Internal Server Error'
        });
    }
};

exports.generateStaffId = async () => {

    let randomId;
    let exists = true;

    while (exists) {

        randomId = Math.floor(100000 + Math.random() * 900000);

        const check = await UserModel.getSingleRecord(
            'students',
            { student_id: randomId },
            'student_id'
        );

        exists = !!check;
    }
    return randomId;
};


exports.login = (req, res) => {
    View.Uview(res, 'login');
};

exports.loginPost = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await UserModel.getSingleRecord('students', { mobile: phone, password: password}, '*');
        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'Invalid Credentials '
            });
        }
        console.log(user);
        const token = jwt.sign(
            {
                id: user.id,
                phone: user.mobile,
                student_id: user.student_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );


        const COOKIE_MAX_AGE = Number(process.env.COOKIE_MAX_AGE) || 172800000;

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE // 1 day
        });

        return res.json({
            status: true,
            message: 'Login Successful',
            redirect: '/user/index'
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};