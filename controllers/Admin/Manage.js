const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const SuperHelper = require('../../helpers/superHelper');
const path = require('path');
exports.dashboard = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await UserModel.getSingleRecord(
            'admins',
            { email: email },
            '*'
        );
        const students = await UserModel.getSingleRecord(
            'students',
            {},
            'count(id) as total'
        );
        const staff = await UserModel.getSingleRecord(
            'staff',
            {},
            'count(id) as total'
        );
        return View.Aview(res, 'dashboard', {
            user: user,
            students: students.total,
            staff: staff.total,
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
    const thead = `
            <tr>
                <th>#</th>
                <th>Student Id</th>
                <th>Roll No</th>
                <th>Name</th>
                <th>Email</th>
                <th>Course</th>
                <th>Subjects</th>
                <th>Total Fees</th>
                <th>Pending Fees</th>
                <th>Joining Date & Time</th>
            </tr>
        `;

    const rows = Array.isArray(result) ? result : (result?.rows || []);

    let tableRows = '';

    for (const [index, u] of rows.entries()) {

        const course = await UserModel.getSingleRecord(
            'courses',
            { id: u.course },
            '*'
        );

        let subjectList = [];

        if (u.subject_ids) {

            const ids = JSON.parse(u.subject_ids);

            for (const id of ids) {

                const subject = await UserModel.getSingleRecord(
                    'subjects',
                    { id },
                    'subject_name'
                );

                if (subject) {
                    subjectList.push(subject.subject_name);
                }

            }

        }

        tableRows += `
            <tr>
    
                <td>${index + 1}</td>
                <td>${u.student_id}</td>
                <td>${u.roll_no}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${course?.course_name || ''}</td>
    
                <td>
                    <button
                        class="btn btn-primary btn-sm view-subjects"
                        data-subjects='${JSON.stringify(subjectList)}'>
                        View
                    </button>
                </td>
    
                <td>${CONSTANTS.currency}${u.total_fees}</td>
                <td>${CONSTANTS.currency}${u.total_fees - u.pending_fees}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
    
            </tr>
            `;

    }

    if (!rows.length) {

        tableRows = `
            <tr>
                <td colspan="3">No Data Found</td>
            </tr>
        `;

    }
    return View.Aview(res, 'reports', {
        title: 'All Students Report',
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




exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true
    });

    return res.redirect('/admin/login');
};

exports.add = async (req, res) => {
    const errors = {};
    let course_name = '', course_code = '';
    let message = '', messageType = '';

    if (req.method === 'POST') {

        ({ course_name = '', course_code = '' } = req.body);
        errors.course_name = !course_name ? 'Course Name required' : '';
        errors.course_code = !course_code ? 'Course Code required' : '';

        Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);

        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {


            await UserModel.addRecord('courses', {
                course_name,
                course_code,
            });

            message = 'Course added successfully!';
            messageType = 'success';

            course_name = '';
            course_code = '';
        }
    }

    const fields = `
        ${Form.label("Course Name")}
        ${Form.text("course_name", course_name, {
        class: `form-control ${errors.course_name ? "is-invalid" : ""}`,
        placeholder: "Enter Course Name"
    })}
        ${errors.course_name ? `<div class="text-danger small mt-1">${errors.course_name}</div>` : ""}

        ${Form.label("Course Code")}
        ${Form.text("course_code", course_code, {
        class: `form-control ${errors.course_code ? "is-invalid" : ""}`,
        placeholder: "Enter Course Code"
    })}
        ${errors.course_code ? `<div class="text-danger small mt-1">${errors.course_code}</div>` : ""}
    `;

    const buttons = `
        ${Form.submit("Add Course", {
        class: "btn btn-dark"
    })}
    `;

    const response = {
        title: 'Add New Course',
        action: '/admin/add',
        method: 'POST',
        message,
        messageType,
        errors,
        fields,
        buttons
    };

    return View.Aview(res, 'forms', response);
};

exports.StaffHistory = async (req, res) => {

    const result = await UserModel.getRecords('staff', {}, '*');

    const thead = `
        <tr>
            <th>#</th>
            <th>Staff Id</th>
            <th>Email</th>
            <th>Name</th>
            <th>Mobile No</th>
            <th>Gender</th>
            <th>Role</th>
            <th>Joining Date</th>
        </tr>
    `;

    const rows = Array.isArray(result) ? result : (result?.rows || []);

    let tableRows = '';

    for (const [index, u] of rows.entries()) {
        const name = await UserModel.getSingleRecord(
            'permissions',
            { role: u.role },
            'name'
        );

        tableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${u.staff_id}</td>
                <td>${u.email}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.mobile}</td>
                <td>${u.gender}</td>
                <td>${name.name}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
                
            </tr>
        `;
    }

    if (!rows.length) {
        tableRows = `
        <tr>
            <td colspan="8">No Data Found</td>
        </tr>
        `;
    }

    return View.Aview(res, 'reports', {
        title: "All Staff History",
        thead,
        tableRows,
    });

};

