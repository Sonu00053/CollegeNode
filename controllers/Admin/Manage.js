const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const SuperHelper = require('../../helpers/superHelper');
const Form = require('../../helpers/FormHelper');

const XLSX = require('xlsx');

const path = require('path');
exports.dashboard = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await UserModel.getSingleRecord(
            'admins',
            { email: email },
            '*'
        );
        return View.Aview(res, 'dashboard', {
            user: user,
            header: 'User Dashboard'
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.users = async (req, res) => {
    const result = await UserModel.getRecords('students', {}, '*');
    thead = `
            <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Course</th>
                <th>Joining Date</th>
            </tr>
        `;
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    let tableRows = '';

    rows.forEach((u, index) => {
        tableRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${u.first_name} ${u.last_name}</td>
                    <td>${u.email}</td>
                    <td>${u.mobile}</td>
                    <td>${u.course}</td>
                    <td>${SuperHelper.formatDate(u.created_at)}</td>

                </tr>
            `;
    });
    if (!rows.length) {
        tableRows = `
            <tr>
                <td colspan="3">No Data Found</td>
            </tr>
        `;
    }
    return View.Aview(res, 'reports', {
        title: 'Students Report',
        thead: thead,
        tableRows,
    });

};

exports.users = async (req, res) => {
    const result = await UserModel.getRecords('students', {}, '*');
    thead = `
            <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Course</th>
                <th>Joining Date</th>
            </tr>
        `;

    const rows = Array.isArray(result) ? result : (result?.rows || []);
    let tableRows = '';

    rows.forEach((u, index) => {
        
        tableRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${u.first_name} ${u.last_name}</td>
                    <td>${u.email}</td>
                    <td>${u.mobile}</td>
                    <td>${u.course}</td>
                    <td>${SuperHelper.formatDate(u.created_at)}</td>

                </tr>
            `;
    });

    if (!rows.length) {

        tableRows = `
            <tr>
                <td colspan="3">No Data Found</td>
            </tr>
        `;

    }
    return View.Aview(res, 'reports', {
        title: 'Students Report',
        thead: thead,
        tableRows,
    });

};
exports.updateStudentStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        const st = Number(status);
        await UserModel.updateRecord(
            'students',
            { status: st },
            { id: id }
        );
        var message = (st === 1 ? 'Approved Successfully' : 'Rejected Successfully');
        return res.json({
            success: true,
            redirect: '/admin/report',
            message: message
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

exports.add = async (req, res) => {

    const errors = {};
    let email = '', password = '', role = '';
    let message = '', messageType = '';
    if (req.method === 'POST') {
        ({ email = '', password = '', role = '' } = req.body);
        errors.email = !email ? 'Email required' : !/\S+@\S+\.\S+/.test(email) ? 'Invalid email' : '';
        errors.password = !password ? 'Password required' : password.length < 4 ? 'Min 4 chars' : '';
        errors.role = !role ? 'Role required' : '';
        Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);
        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {
            const staff = await UserModel.getSingleRecord('staff', { email }, '*');
            const exists = await UserModel.getSingleRecord('admins', { email }, '*');
            if (staff) {
                if (!exists) {
                    await UserModel.addRecord('admins', {
                        email,
                        password,
                        role,
                        access: JSON.stringify(["super/index"]),
                        created_at: new Date()
                    });
                    message = 'User added successfully!';
                    messageType = 'success';
                    email = '';
                    password = '';
                    role = '';
                } else {
                    message = 'This Email already exists';
                    messageType = 'error';
                }
            } else {
                message = 'This user does not exist';
                messageType = 'error';
            }
        }
    }
    const fields = `
            ${Form.label("Email")}
            ${Form.email("email", email, {
        class: `form-control ${errors.email ? "is-invalid" : ""}`,
        placeholder: "Enter Email"
    })}
            ${errors.email ? `<div class="text-danger small mt-1">${errors.email}</div>` : ""}

            ${Form.label("Password")}
            ${Form.password("password", password, {
        class: `form-control ${errors.password ? "is-invalid" : ""}`,
        placeholder: "Enter Password"
    })}
            ${errors.password ? `<div class="text-danger small mt-1">${errors.password}</div>` : ""}

            ${Form.label("Role")}
            ${Form.dropdown(
        "role",
        {
            "": "Select Role",
            SA: "Subadmin",
            AC: "Accountant"
        },
        role,
        {
            class: `form-control ${errors.role ? "is-invalid" : ""}`
        }
    )}
            ${errors.role ? `<div class="text-danger small mt-1">${errors.role}</div>` : ""}
        `;
    const buttons = `
            ${Form.submit("Save", {
        class: "btn btn-success"
    })}
            ${Form.button("Back", {
        class: "btn btn-secondary",
        onclick: "window.location.href='/admin/report'"
    })}
        `;
    const response = {
        title: 'Add Role',
        action: '/admin/add',
        method: 'POST',
        message,
        messageType,
        errors,
        fields: fields,
        buttons: buttons
    };

    return View.Aview(res, 'forms', response);
};


exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true
    });

    return res.redirect('/admin/login');
};