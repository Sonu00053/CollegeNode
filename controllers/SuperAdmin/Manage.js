const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const XLSX = require('xlsx');
const path = require('path');
exports.dashboard = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await UserModel.getSingleRecord(
            'admins',
            { email:email },
            '*'
        );
        return View.Sview(res, 'dashboard', {
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

exports.users = async (req, res) => {
    const result = await UserModel.getRecords('users', {}, '*');
    thead = `
            <tr>
                <th>#</th>
                <th>Email</th>
                <th>Date</th>
            </tr>
        `;

    const rows = Array.isArray(result) ? result : (result?.rows || []);
    let tableRows = '';

    rows.forEach((u, index) => {
        tableRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${u.email}</td>
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
    return View.Sview(res, 'reports', {
       title: 'All Students Report',
        thead: thead,
        tableRows,
    });

};

// exports.add = async (req, res) => {

//     const errors = {};
//     let email = '', password = '', role = '';
//     let message = '', messageType = '';

//     if (req.method === 'POST') {

//         ({ email, password, role } = req.body);

//         if (!email)
//             errors.email = 'Email required';
//         else if (!/\S+@\S+\.\S+/.test(email))
//             errors.email = 'Invalid email';

//         if (!role)
//             errors.role = 'Role required';

//         if (!password)
//             errors.password = 'Password required';
//         else if (password.length < 4)
//             errors.password = 'Min 4 chars';

//         if (Object.keys(errors).length) {
//             message = 'Fix validation errors';
//             messageType = 'error';
//         } else {

//             const exists = await UserModel.getSingleRecord('admins', { email: email }, '*');
//             const roleExist = await UserModel.getSingleRecord('admins', { role: role }, '*');

//             if (exists) {
//                 message = 'This Email already exists';
//                 messageType = 'error';
//             } else {
//                 if (roleExist) {
//                     message = 'This Role already exists';
//                     messageType = 'error';
//                 } else {

//                     await UserModel.addRecord('admins', {
//                         email,
//                         password,
//                         role,
//                         created_at: new Date()
//                     });

//                     message = 'User added successfully!';
//                     messageType = 'success';

//                     email = password = '';
//                 }
//             }
//         }
//     }
//     const fields = `
//             <div class="mb-3">
//                 <label>Email</label>
//                 <input name="email" class="form-control ${errors.email ? 'is-invalid' : ''}" value="${email}">
//                 ${errors.email ? `<small class="text-danger">${errors.email}</small>` : ''}
//             </div>

//             <div class="mb-3">
//                 <label>Password</label>
//                 <input type="password" name="password" class="form-control ${errors.password ? 'is-invalid' : ''}" value="${password}">
//                 ${errors.password ? `<small class="text-danger">${errors.password}</small>` : ''}
//             </div>

//             <div class="mb-3">
//         <label>Role</label>
//         <select name="role" class="form-control ${errors.role ? 'is-invalid' : ''}">
//             <option value="">Select Role</option>
//             <option value="SA" ${role === 'SUBADMIN' ? 'selected' : ''}>Subadmin</option>
//             <option value="AC" ${role === 'ACCOUNTANT' ? 'selected' : ''}>Accountant</option>
//         </select>
//         ${errors.role ? `<small class="text-danger">${errors.role}</small>` : ''}
//     </div>
//         `;
//     const buttons = `
//             <button class="btn btn-success">Save</button>
//             <a href="/admin/report" class="btn btn-secondary">Back</a>
//         `;

//     return View.Aview(res, 'forms', {
//         title: 'Add User',
//         action: '/admin/add',
//         method: 'POST',
//         message,
//         messageType,
//         fields,
//         buttons
//     });
// };

exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true
    });

    return res.redirect('/super/login');
};
