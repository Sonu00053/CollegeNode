const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const jwt = require('jsonwebtoken');

exports.coursefessupdate = async (req, res) => {

    let course = '';
    let message = '';
    let messageType = '';

    // Get all active courses
    const courseList = await UserModel.getRecords(
        'courses',
        { status: 1 },
        '*'
    );

    let selectedCourse = null;

    if (req.method === 'POST') {

        course = req.body.course || '';

        if (course) {
            selectedCourse = await UserModel.getSingleRecord(
                'courses',
                { id: course },
                '*'
            );
            if (req.body.action_type == 'update') {
                const updateData = {};
                for (let i = 1; i <= Number(selectedCourse.duration); i++) {
                    updateData[`${i}y`] = req.body[`${i}y`] || 0;
                }
                console.log('updateData', updateData);
                await UserModel.updateRecord(
                    'courses',
                    updateData,
                    { id: course }
                );

                const addata = {
                    course_name: selectedCourse.course_name,
                    duration: selectedCourse.duration,
                    course_id: selectedCourse.id
                };
                for (let i = 1; i <= Number(selectedCourse.duration); i++) {
                    addata[`${i}y`] = req.body[`${i}y`] || 0;
                }
                await UserModel.addRecord(
                    'fess_update',
                    addata
                );
                message = "Course Fees Updated Successfully.";
                messageType = "success";
                selectedCourse = await UserModel.getSingleRecord(
                    'courses',
                    { id: course },
                    '*'
                );

            }

        }

    }
    let courseOptions = `<option value="">Select Course</option>`;
    courseList.forEach(item => {
        courseOptions += `
            <option value="${item.id}" ${course == item.id ? 'selected' : ''}>
                ${item.course_name}
            </option>
        `;

    });

    // Dynamic Year Inputs
    let yearFields = '';

    if (selectedCourse) {

        for (let i = 1; i <= Number(selectedCourse.duration); i++) {

            yearFields += `
            <div class="col-md-4 mb-3">

                <label>${i} Year Fees</label>

                <input
                    type="text"
                    class="form-control"
                    name="${i}y"
                    value="${selectedCourse[`${i}y`] || ''}"
                    placeholder="Enter ${i} Year Fees"
                    oninput="this.value=this.value.replace(/[^0-9]/g,'')">

            </div>
            `;

        }

    }

    const fields = `

    <div class="row">

        <div class="col-md-6">

            <label>Course</label>

            <select
                name="course"
                id="course"
                class="form-control"
                onchange="loadCourseFees()">

                ${courseOptions}

            </select>

        </div>

    </div>

    <br>

    <div class="row" id="yearFields">

        ${yearFields}

    </div>

    <input type="hidden" name="action_type" id="action_type" value="">

    

    `;

    const buttons = selectedCourse
        ? `
            <button
                type="submit"
                class="btn btn-dark"
                onclick="return updateFees()">
                Update Fees
            </button>
        `
        : '';

    const response = {

        title: 'Course Fees Update',

        action: CONSTANTS.role + 'fees-update',

        method: 'POST',

        message,

        messageType,

        fields,

        buttons

    };

    return View.Rview(res, 'forms', response);

};

exports.coursefeeshistory = async (req, res) => {

    const result = await UserModel.getRecords(
        'fess_update',
        {},
        '*'
    );

    const thead = `
        <tr>
            <th>#</th>
            <th>Course</th>
            <th>1st Year Fees</th>
            <th>2nd Year Fees</th>
            <th>3rd Year Fees</th>
            <th>Update Date & Time</th>
        </tr>
    `;
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    let tableRows = '';
    rows.forEach((row, index) => {
        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${row.course_name}</td>
            <td>${CONSTANTS.currency}${row['1y'] || 0}</td>
            <td>${row.duration >= 2 ? CONSTANTS.currency + (row['2y'] || 0) : '-'}</td>
            <td>${row.duration >= 3 ? CONSTANTS.currency + (row['3y'] || 0) : '-'}</td>
            <td>${SuperHelper.formatDate(row.created_at)}</td>
        </tr>
        `;
    });
    if (!rows.length) {

        tableRows = `
            <tr>
                <td colspan="8" class="text-center">
                    No Data Found
                </td>
            </tr>
        `;

    }

    return View.Rview(res, 'reports', {

        title: `
            <div class="d-flex justify-content-between">
                <span>Course Fees Update History</span>
            </div>
        `,

        thead,

        tableRows

    });

};


exports.headsHistory = async (req, res) => {
    const result = await UserModel.getRecords(
        'fee_structure',
        { course_id: 1, year: 1 },
        '*'
    );
    const thead = `
        <tr>
            <th>#</th>
            <th>Course</th>
            <th>Year</th>
            <th>Head</th>
            <th>Status</th>
            <th>Amount</th>
        </tr>
    `;
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    let tableRows = '';
    let totalAmount = 2000;
    rows.forEach((row, index) => {
        const amount = Number(row.amount);
        let checkAmount = 0;
        if (totalAmount >= amount) {
            checkAmount = '<span class="badge bg-success">Clear</span>';
             totalAmount -= amount;
        } else {
            checkAmount = amount - Math.max(totalAmount, 0);
            checkAmount = `<span class="badge bg-warning">${CONSTANTS.currency}${checkAmount}</span>`;
            totalAmount = 0;
        }
        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${row.course}</td>
            <td>${row.year}</td>
            <td>${row.head_name}</td>
            <td>${checkAmount}</td>
            <td>${CONSTANTS.currency}${row.amount || 0}</td>
        </tr>
        `;
    });
    if (!rows.length) {
        tableRows = `
            <tr>
                <td colspan="8" class="text-center">
                    No Data Found
                </td>
            </tr>
        `;
    }
    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between">
                <span>Fees Structure</span>
            </div>
        `,
        thead,
        tableRows
    });

};