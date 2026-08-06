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
    const thead = `
        <tr>
            <th>#</th>
            <th>Student Id</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Father Name</th>
            <th>Mother Name</th>
            <th>Email</th>
            <th>Course</th>
            <th>Subjects</th>
            <th>Total Fees</th>
            <th>Pending Fees</th>
            <th>Admission Date</th>
            <th>Action</th>
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
        const admdate = SuperHelper.OnlyDate(u.admission_date);


        const profile = '<a href="' + '/admin/profile/' + u.student_id + '" class="btn btn-sm btn-warning">View Profile</a>';
        const Editprofile = '<a href="' + '/admin/update-profile/' + u.student_id + '" class="btn btn-sm btn-info">Edit Profile</a>';

        tableRows += `
        <tr>

            <td>${index + 1}</td>
            <td>${u.student_id}</td>
            <td>${u.roll_no}</td>
            <td>${u.first_name} ${u.last_name}</td>
            <td>${u.father_name}</td>
            <td>${u.mother_name}</td>
            <td>${u.email}</td>

            <td>${course?.course_name + ' - ' + u.course_year || ''}</td>

            <td>
                <button
                    class="btn btn-primary btn-sm view-subjects"
                    data-subjects='${JSON.stringify(subjectList)}'>
                    View
                </button>
            </td>

            <td>${CONSTANTS.currency}${u.total_fees}</td>
            <td>${CONSTANTS.currency}${u.total_fees - u.pending_fees}</td>
            <td>${admdate}</td>
            <td class="d-flex gap-2">${profile} ${Editprofile}</td>

        </tr>
        `;

    }

    if (!rows.length) {

        tableRows = `
        <tr>
            <td colspan="10" class="text-center">
                No Data Found
            </td>
        </tr>
        `;

    }

    return View.Aview(res, 'reports', {

        title: `
        <div class="d-flex justify-content-between">
            <span>All Students Report</span>
        </div>
        `,

        thead,
        tableRows

    });

};


exports.profile = async (req, res) => {
    try {
        const student_id = req.params.student_id;
        const user = await UserModel.getSingleRecord(
            'students',
            {
                student_id: student_id
            },
            '*'         
        );
        const course = await UserModel.getSingleRecord(
            'courses',
            {
                id: user.course
            },
            '*'
        );
        const date = new Date(user.admission_date);
        // const year = date.getFullYear();
        // const month = String(date.getMonth() + 1).padStart(2, '0');
        // const day = String(date.getDate()).padStart(2, '0');
        const newdate = SuperHelper.OnlyDate(user.admission_date);
        const admissionDate = newdate;
        // const admissionDate = new Date(user.admission_date).toLocaleDateString('en-GB')
        const PendiFees = (Number(user.total_fees) - Number(user.pending_fees));
        const yearMap = {
            1: '1st Year',
            2: '2nd Year',
            3: '3rd Year',
        };



        const courseYear = yearMap[user.course_year] || `${user.course_year}th Year`;
        const dob = new Date(user.dob).toISOString().split('T')[0];
        //   const dob = new Date(user.dob).toLocaleDateString('en-GB');

        var start = user.start;
        var end = String(user.end).slice(-2);
        return View.Aview(res, 'profile', {
            header: 'User Profile',
            user,
            course,
            start,
            end, dob,
            courseYear,
            admissionDate,
            PendiFees
        });
    } catch (err) {
        console.log(err);

        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
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

// exports.logout = (req, res) => {
//     res.clearCookie('token', {
//         httpOnly: true
//     });

//     return res.redirect(CONSTANTS.role + 'login');
// };

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




exports.admissionrecieptrequest = async (req, res) => {
    const result = await UserModel.getRecords('receipt_details_update', { status: 0 }, '*');
    const thead = `
            <tr>
                <th>#</th>
                <th>Reciept No</th>
                <th>Student Id</th>
                <th>Roll No</th>
                <th>Old Amount</th>
                <th>New Amount</th>
                <th>Created At</th>
                <th>Action</th>
            </tr>
        `;

    const rows = Array.isArray(result) ? result : (result?.rows || []);

    let tableRows = '';

    for (const [index, u] of rows.entries()) {
        tableRows += `
            <tr>
    
                <td>${index + 1}</td>
                <td>${u.receipt_no}</td>
                <td>${u.student_id}</td>
                <td>${u.roll_no}</td>
                <td>${u.amount}</td>
                <td>${u.new_amount}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
                <td>
                <button
                    type="button"
                    class="btn btn-success btn-sm receiptAction"
                    data-id="${u.id}"
                    data-action="approve">
                    <i class="bi bi-check-circle"></i> Approve
                </button>
                <button
                    type="button"
                    class="btn btn-danger btn-sm receiptAction"
                    data-id="${u.id}"
                    data-action="reject">
                    <i class="bi bi-x-circle"></i> Reject
                </button>
</td>
            </tr>
            `;

    }


    return View.Aview(res, 'reports', {
        title: 'Admission Reciept Request History',
        thead: thead,
        tableRows,
    });

};

exports.admissionReceiptRequestAction = async (req, res) => {

    try {

        const { id, action } = req.body;
        const request = await UserModel.getSingleRecord(
            'receipt_details_update',
            { id },
            '*'
        );

        const Table = request.reciept_table;

        if (!request) {
            return res.json({
                status: false,
                message: 'Request not found.'
            });
        }

        if (action === 'approve') {

            // Receipt amount update
            await UserModel.updateRecord(
                Table,
                {
                    amount: request.new_amount
                },
                {
                    id: request.table_id
                }
            );

            if (Number(request.student_pending) != 0 && Number(request.student_available) != 0) {
                await UserModel.updateRecord(
                    'students',
                    {
                        pending_fees: request.student_pending,
                        available_fees: request.student_available,
                    },
                    {
                        student_id: request.student_id
                    }
                );
            }
            await UserModel.updateRecord(
                'receipt_details_update',
                {
                    status: 1
                },
                {
                    id
                }
            );

            return res.json({
                status: true,
                message: 'Request approved successfully.'
            });

        } else if (action === 'reject') {

            await UserModel.updateRecord(
                'receipt_details_update',
                {
                    status: 2
                },
                {
                    id
                }
            );

            return res.json({
                status: true,
                message: 'Request rejected successfully.'
            });

        } else {

            return res.json({
                status: false,
                message: 'Invalid action.'
            });

        }

    } catch (err) {

        console.log(err);

        return res.json({
            status: false,
            message: 'Something went wrong.'
        });

    }

};


exports.updatestidentProfile = async (req, res) => {

    const student_id = req.params.student_id;
    const staff_id = req.user.role;
   



    let first_name = "";
    let last_name = "";
    let mobile = "";
    let father_mobile = "";
    let mother_name = "";
    let email = "";
    let dob = "";
    let address = "";
    let category = "";
    let aadhar_no = "";


    let message = "";
    let messageType = "";
    let rediret = "";


    const errors = {};

    const redirectUrl = "/admin/update-profile/" + student_id;

    // Fetch Student
    let student = await UserModel.getSingleRecord(
        "students",
        { student_id },
        "*"
    );

    

    // Show DB values on first load
    if (req.method !== "POST") {
        first_name = student.first_name || "";
        last_name = student.last_name || "";
        mobile = student.mobile || "";
        father_mobile = student.father_mobile || "";
        mother_name = student.mother_name || "";
        email = student.email || "";
        category = student.category || "";
        aadhar_no = student.aadhar_no || "";

        dob = "";
        if (student.dob) {
            dob = SuperHelper.OnlyDate(student.dob)
        }
        address = student.address || "";
    }

    if (req.method === "POST") {

        ({
            first_name = "",
            last_name = "",
            mobile = "",
            father_mobile = "",
            mother_name = "",
            email = "",
            dob = "",
            address = "",
            category = "",
            aadhar_no = ""
        } = req.body);

        dob = dob.trim();
        address = address.trim();
        console.log(req.body);

        first_name = first_name.trim();
        last_name = last_name.trim();
        mobile = mobile.trim();
        father_mobile = father_mobile.trim();
        mother_name = mother_name.trim();
        email = email.trim();
        category = category.trim();
        aadhar_no = aadhar_no.trim();

        // Validation



        if (!first_name) {
            errors.first_name = "First Name is required.";
        }

        if (!last_name) {
            errors.last_name = "Last Name is required.";
        }

        if (!mobile) {
            errors.mobile = "Mobile Number is required.";
        } else if (!/^[0-9]{10}$/.test(mobile)) {
            errors.mobile = "Enter a valid 10 digit mobile number.";
        }

        if (father_mobile && !/^[0-9]{10}$/.test(father_mobile)) {
            errors.father_mobile = "Enter a valid 10 digit mobile number.";
        }

        if (!mother_name) {
            errors.mother_name = "Mother Name is required.";
        }

        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            errors.email = "Invalid Email Address.";
        }

        if (!dob) {
            errors.dob = "Date of Birth is required.";
        }

        if (!address) {
            errors.address = "Address is required.";
        }
        if (!category) {
            errors.category = "Category is required.";
        }

        if (aadhar_no && !/^\d{12}$/.test(aadhar_no)) {
            errors.aadhar_no = "Aadhar Number must be 12 digits.";
            const checkAdhaar = await UserModel.getSingleRecord(
                "students",
                { aadhar_no },
                "*"
            );

            if (checkAdhaar && student_id != checkAdhaar.aadhar_no) {
                errors.aadhar_no = "Aadhar Number already exists.";
                message = "Aadhar Number already exists.";
                messageType = "error";
            }
        }



        if (Object.keys(errors).length > 0) {

            message = "Please fix the validation errors.";
            messageType = "error";

        } else {
            await UserModel.addRecord('profile_update', {
                student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                mobile: student.mobile,
                father_mobile: student.father_mobile,
                mother_name: student.mother_name,
                email: student.email,
                category: student.category,
                aadhar_no: student.aadhar_no,
                course: student.course,
                course_year: student.course_year,
                staff_id: staff_id
            });

            await UserModel.updateRecord(
                "students",
                {
                    first_name,
                    last_name,
                    mobile,
                    father_mobile,
                    mother_name,
                    email,
                    category,
                    aadhar_no
                },
                { student_id }

            );



            message = "Student profile updated successfully.";
            messageType = "success";

            // Refresh student data
            student = await UserModel.getSingleRecord(
                "students",
                { student_id },
                "*"
            );
        }
    }

    const fields = `

    ${Form.label("First Name *")}
    ${Form.text("first_name", first_name, {
        class: `form-control ${errors.first_name ? "is-invalid" : ""}`,
        placeholder: "Enter First Name"
    })}
    ${errors.first_name ? `<div class="invalid-feedback d-block">${errors.first_name}</div>` : ""}

    <br>

    ${Form.label("Last Name *")}
    ${Form.text("last_name", last_name, {
        class: `form-control ${errors.last_name ? "is-invalid" : ""}`,
        placeholder: "Enter Last Name"
    })}
    ${errors.last_name ? `<div class="invalid-feedback d-block">${errors.last_name}</div>` : ""}

    <br>

    ${Form.label("Mobile *")}
    <input
        type="text"
        name="mobile"
        value="${mobile}"
        maxlength="10"
        class="form-control ${errors.mobile ? "is-invalid" : ""}"
        placeholder="Enter Mobile Number"
        oninput="this.value=this.value.replace(/[^0-9]/g,'')">

    ${errors.mobile ? `<div class="invalid-feedback d-block">${errors.mobile}</div>` : ""}

    <br>

    ${Form.label("Father Mobile")}
    <input
        type="text"
        name="father_mobile"
        value="${father_mobile}"
        maxlength="10"
        class="form-control ${errors.father_mobile ? "is-invalid" : ""}"
        placeholder="Enter Father Mobile"
        oninput="this.value=this.value.replace(/[^0-9]/g,'')">

    ${errors.father_mobile ? `<div class="invalid-feedback d-block">${errors.father_mobile}</div>` : ""}

    <br>

    ${Form.label("Mother Name *")}
    ${Form.text("mother_name", mother_name, {
        class: `form-control ${errors.mother_name ? "is-invalid" : ""}`,
        placeholder: "Enter Mother Name"
    })}
    ${errors.mother_name ? `<div class="invalid-feedback d-block">${errors.mother_name}</div>` : ""}

    <br>

    ${Form.label("Email")}
    <input
        type="email"
        name="email"
        value="${email}"
        class="form-control ${errors.email ? "is-invalid" : ""}"
        placeholder="Enter Email">

    ${errors.email ? `<div class="invalid-feedback d-block">${errors.email}</div>` : ""}
    <br>

${Form.label("Date of Birth *")}
<input
    type="date"
    name="dob"
    value="${dob}"
    class="form-control ${errors.dob ? "is-invalid" : ""}">

${errors.dob ? `<div class="invalid-feedback d-block">${errors.dob}</div>` : ""}

<br>

${Form.label("Address *")}
<textarea
    name="address"
    rows="3"
    class="form-control ${errors.address ? "is-invalid" : ""}"
    placeholder="Enter Address">${address}</textarea>

${errors.address ? `<div class="invalid-feedback d-block">${errors.address}</div>` : ""}
<br>

${Form.label("Category *")}
<select name="category" class="form-control ${errors.category ? "is-invalid" : ""}">

    ${category
            ? `<option value="${category}" selected>${category}</option>`
            : `<option value="">Select Category</option>`
        }

    ${category !== "GENERAL" ? `<option value="GENERAL">GENERAL</option>` : ""}
    ${category !== "OBC" ? `<option value="OBC">OBC</option>` : ""}
    ${category !== "SC" ? `<option value="SC">SC</option>` : ""}
    ${category !== "ST" ? `<option value="ST">ST</option>` : ""}
    ${category !== "SIKH" ? `<option value="SIKH">SIKH Minority</option>` : ""}

</select>

${errors.category ? `<div class="text-danger small mt-1">${errors.category}</div>` : ""}

<br>

${Form.label("Aadhar Number")}
<input
    type="text"
    name="aadhar_no"
    value="${aadhar_no}"
    maxlength="12"
    class="form-control ${errors.aadhar_no ? "is-invalid" : ""}"
    placeholder="Enter Aadhar Number"
    oninput="this.value=this.value.replace(/[^0-9]/g,'')">

${errors.aadhar_no ? `<div class="text-danger small mt-1">${errors.aadhar_no}</div>` : ""}

    `;

    const buttons = `
        ${Form.submit("Update Profile", {
        class: "btn btn-dark"
    })}
    `;

    const response = {
        title: "Update Student Profile",
        action: redirectUrl,
        redirect: rediret,
        currency: CONSTANTS.currency,
        method: "POST",
        message,
        messageType,
        errors,
        fields,
        buttons,
        redirectUrl,
        student
    };

    return View.Aview(res, "forms", response);
};

