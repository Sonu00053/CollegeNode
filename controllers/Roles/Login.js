const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// const bcrypt = require('bcryptjs');




exports.loginView = (req, res) => {
    const token = req.cookies.token;

    if (token) {
        return res.redirect(`${global.CONSTANTS.role}index`);
    }
    View.Rview(res, 'login');
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.getSingleRecord('staff', { email: email, password: password }, '*');
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
                role: user.role,
                check: CONSTANTS.role,
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
            redirect: CONSTANTS.role + 'index'
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.changePassword = async (req, res) => {
    const errors = {};
    const email = req.user.email; // ya decoded.email
    let password = '', confirmpassword = '';
    let message = '', messageType = '';
    if (req.method === 'POST') {
        ({ confirmpassword = '', password = '' } = req.body);
        errors.password = !password ? 'Password required' : password.length < 6 ? 'Min 6 chars' : '';
        errors.confirmpassword = !confirmpassword ? 'Confirm Password required' : confirmpassword.length < 6 ? 'Min 6 chars' : '';
        Object.keys(errors).forEach(k => !errors[k] && delete errors[k])
        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {
            if (confirmpassword == password) {
                await UserModel.updateRecord(
                    'staff',
                    {
                        password
                    },
                    {
                        email: email
                    }
                );
                message = 'User Password Update successfully!';
                messageType = 'success';
                password = '';
                confirmpassword = '';

            } else {
                message = 'Confirm Password Does Not Match';
                messageType = 'error';
            }
        }
    }
    const fields = `
            ${Form.label("Password")}
            ${Form.password("password", password, {
        class: `form-control ${errors.password ? "is-invalid" : ""}`,
        placeholder: "Enter Password"
    })}
            ${errors.password ? `<div class="text-danger small mt-1">${errors.password}</div>` : ""}

           ${Form.label("Confirm Password")}
            ${Form.password("confirmpassword", confirmpassword, {
        class: `form-control ${errors.confirmpassword ? "is-invalid" : ""}`,
        placeholder: "Enter Confirm Password"
    })}
            ${errors.confirmpassword ? `<div class="text-danger small mt-1">${errors.confirmpassword}</div>` : ""}`;
    const buttons = `
            ${Form.submit("Update", {
        class: "btn btn-dark"
    })}
 
        `;
    const response = {
        title: 'Change Password',
        action: CONSTANTS.role + 'change-password',
        method: 'POST',
        message,
        messageType,
        errors,
        fields: fields,
        buttons: buttons
    };

    return View.Rview(res, 'forms', response);
};

exports.registerView = async (req, res) => {
    try {
        const course = await UserModel.getRecords('courses', {}, '*');
        const subjects = await UserModel.getRecords('subjects', {}, '*');
        return View.Rview(res, 'register', {
            course
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.getSubjectsByCourse = async (req, res) => {
    try {
        const { course_id } = req.params;

        const subjects = await UserModel.getRecords(
            'subjects',
            { course_id },
            '*'
        );

        return res.json({
            status: true,
            subjects
        });

    } catch (err) {
        return res.json({
            status: false
        });
    }
};



exports.register = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            roll_no,
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
            password,
            transport,
            vehicle_name,
            vehicle_no,
            subject_ids
        } = req.body;

        // Required Validation
        if (
            !first_name ||
            !last_name ||
            !dob ||
            !roll_no ||
            !gender ||
            !father_name ||
            !father_mobile ||
            !mother_name ||
            !mobile ||
            !email ||
            !pincode ||
            !address ||
            !city ||
            !state ||
            !course ||
            !semester ||
            !password
        ) {
            return res.status(400).json({
                status: false,
                message: 'All required fields are mandatory'
            });
        }
        if (transport === 'Yes') {

            if (!vehicle_name || !vehicle_no) {
                return res.status(400).json({
                    status: false,
                    message: 'Vehicle Name and Vehicle No are required'
                });
            }

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
        const existingRollNo = await UserModel.getSingleRecord(
            'students',
            { roll_no },
            '*'
        );

        if (existingRollNo) {
            return res.status(400).json({
                status: false,
                message: 'Roll No already exists'
            });
        }
        let subjectsArray = [];
        try {
            subjectsArray = subject_ids ? JSON.parse(subject_ids) : [];
        } catch (e) {
            subjectsArray = [];
        }

        const student_id = await exports.generateStaffId();
        const insertData = {
            student_id,
            roll_no,
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
            transport,
            vehicle_name: transport === 'Yes' ? vehicle_name : '',
            vehicle_no: transport === 'Yes' ? vehicle_no : '',
            password,
            subject_ids: JSON.stringify(subjectsArray)
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
