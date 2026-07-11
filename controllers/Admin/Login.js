const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// const bcrypt = require('bcryptjs');




exports.loginView = (req, res) => {
    const token = req.cookies.token;
    if (token) {
        return res.redirect(`${global.CONSTANTS.admin}index`);
    }
    View.Aview(res, 'login');
};




exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.getSingleRecord('admins', { email: email, password: password, role: 'A' }, '*');

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
            redirect: '/admin/index'
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

// exports.registerView = (req, res) => {
//     View.Aview(res, 'register'
//     );
// };

exports.registerView = async (req, res) => {
    try {
        const states = await UserModel.getRecords('states', {}, '*');
        console.log('States:', states);
        return View.Aview(res, 'register',
            {
                states
            }
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};



exports.register = async (req, res) => {
    try {
        const {
            first_name,
            middle_name,
            last_name,
            dob,
            gender,
            role,
            father_name,
            mother_name,
            email,
            mobile,
            pincode,
            address,
            city,
            state,
            password
        } = req.body;

        // ===================== VALIDATION START ===================== //
        const errors = {};

        // Required fields
        if (!first_name) errors.first_name = "First name is required";
        if (!last_name) errors.last_name = "Last name is required";
        if (!dob) errors.dob = "Date of birth is required";
        if (!gender) errors.gender = "Gender is required";
        if (!role) errors.role = "Role is required";
        if (!father_name) errors.father_name = "Father name is required";
        if (!mother_name) errors.mother_name = "Mother name is required";
        if (!email) errors.email = "Email is required";
        if (!mobile) errors.mobile = "Mobile is required";
        if (!pincode) errors.pincode = "Pincode is required";
        if (!address) errors.address = "Address is required";
        if (!city) errors.city = "City is required";
        if (!state) errors.state = "State is required";
        if (!password) errors.password = "Password is required";

        // Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            errors.email = "Invalid email format";
        }

        // Mobile validation (10 digits)
        const mobileRegex = /^[0-9]{10}$/;
        if (mobile && !mobileRegex.test(mobile)) {
            errors.mobile = "Mobile must be 10 digits";
        }

        // Pincode validation (6 digits)
        const pinRegex = /^[0-9]{6}$/;
        if (pincode && !pinRegex.test(pincode)) {
            errors.pincode = "Pincode must be 6 digits";
        }

        // Password strength (simple)
        if (password && password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }

        // Gender validation
        if (gender && !["male", "female", "other"].includes(gender.toLowerCase())) {
            errors.gender = "Gender must be male, female, or other";
        }

        // If errors exist
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                status: false,
                message: "All Fields Required",
                errors
            });
        }
        // ===================== VALIDATION END ===================== //

        // Check duplicate email & mobile
        const existingUser = await UserModel.getSingleRecord('staff', { email }, '*');
        const existingMobile = await UserModel.getSingleRecord('staff', { mobile }, '*');
        const permission = await UserModel.getSingleRecord('permissions', { role }, '*');

        console.log(permission);
        if (existingUser) {
            return res.status(400).json({
                status: false,
                message: 'Email already exists'
            });
        }

        if (existingMobile) {
            return res.status(400).json({
                status: false,
                message: 'Mobile already exists'
            });
        }
        if (!permission) {
            return res.status(400).json({
                status: false,
                message: 'Please Select Role'
            });
        }

        // Generate staff ID
        const staff_id = await exports.generateStaffId();

        await UserModel.addRecord('staff', {
            staff_id,
            first_name,
            middle_name,
            last_name,
            dob,
            gender,
            role,
            father_name,
            access: permission.permission,
            mother_name,
            email,
            mobile,
            pincode,
            address,
            city,
            state,
            password,
            created_at: new Date()
        });

        return res.json({
            status: true,
            message: 'Staff Registered Successfully'
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.generateStaffId = async () => {

    let randomId;
    let exists = true;

    while (exists) {

        randomId = Math.floor(100000 + Math.random() * 900000);

        const check = await UserModel.getSingleRecord(
            'staff',
            { staff_id: randomId },
            'staff_id'
        );

        exists = !!check;
    }
    return randomId;
};

