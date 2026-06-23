const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const SuperHelper = require('../../helpers/superHelper');
exports.addSubadmin = async (req, res) => {

    let errors = {};
    let name = '', email = '', password = '';
    let message = '', messageType = '';

    if (req.method === 'POST') {

        ({ name, email, password } = req.body);

        // 🔥 validation
        if (!name) errors.name = 'Name required';

        if (!email)
            errors.email = 'Email required';
        else if (!/\S+@\S+\.\S+/.test(email))
            errors.email = 'Invalid email';

        if (!password)
            errors.password = 'Password required';
        else if (password.length < 4)
            errors.password = 'Min 4 chars';

        if (!Object.keys(errors).length) {

            const exists = await UserModel.getSingleRecord('subadmins', { email }, '*');

            if (exists) {
                message = 'Email already exists';
                messageType = 'error';
            } else {

                await UserModel.addRecord('subadmins', {
                    name,
                    email,
                    password,
                    role: 'SUBADMIN',
                    created_at: new Date()
                });

                message = 'Subadmin created successfully!';
                messageType = 'success';

                name = email = password = '';
            }

        } else {
            message = 'Fix validation errors';
            messageType = 'error';
        }
    }
    const fields = `
            <div class="mb-3">
                <label>Name</label>
                <input name="name" class="form-control ${errors.name ? 'is-invalid' : ''}" value="${name}">
                ${errors.name ? `<small class="text-danger">${errors.name}</small>` : ''}
            </div>

            <div class="mb-3">
                <label>Email</label>
                <input name="email" class="form-control ${errors.email ? 'is-invalid' : ''}" value="${email}">
                ${errors.email ? `<small class="text-danger">${errors.email}</small>` : ''}
            </div>

            <div class="mb-3">
                <label>Password</label>
                <input type="password" name="password" class="form-control ${errors.password ? 'is-invalid' : ''}" value="${password}">
                ${errors.password ? `<small class="text-danger">${errors.password}</small>` : ''}
            </div>
        `;

        const buttons = `
            <button class="btn btn-success">Save</button>
            <a href="/admin/subadmin/list" class="btn btn-secondary">Back</a>
        `;

    return View.Aview(res, 'forms', {
        title: 'Create Subadmin',
        action: '/role/subAdmin/',
        method: 'POST',
        message,
        messageType,
        fields,
        buttons
    });
};