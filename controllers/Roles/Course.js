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
    const student_id = req.params.student_id;
    const student = await UserModel.getSingleRecord(
        'students',
        { student_id },
        '*'
    );
    // if (!student) {
    //     return res.status(404).send('<span class="text-center">Student not found</span>');
    // }

    if (!student) {
        return SuperHelper.send404(res);
    }
    const result = await UserModel.getRecords(
        'fee_structure',
        { course_id: student.course, year: student.course_year },
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
    let totalAmount = Number(student.pending_fees);
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
            <div class="d-flex justify-content-between align-items-center">
                <span>Fees Structure</span>
                Pending Fees : ${CONSTANTS.currency}${Number(student.total_fees - student.pending_fees)}
            </div>
        `,
        thead,
        tableRows
    });

};


exports.recieptheadupdate = async (req, res) => {

    // let course = req.body.course || '';
    // let roll_id = req.body.roll_id || '';
    const errors = {};

    let course = req.body?.course || '';
    let message = '';
    let messageType = '';
    let selectedCourse = '';
    let selectedRoll = '';

    const courseList = await UserModel.getRecords(
        'roll_no',
        {},
        '*'
    );
    if (course != '') {

        selectedRoll = await UserModel.getSingleRecord(
            'roll_no',
            { id: course },
            '*'
        );

        console.log(selectedRoll);

    }
    if (req.method === "POST" && req.body?.action_type === "update") {

        if (!course) {
            errors.course = "Please select course.";
        }

        if (!req.body.admission) {
            errors.admission = "Admission fee required.";
        }

        if (!req.body.tution) {
            errors.tution = "Tution fee required.";
        }

        if (!req.body.security) {
            errors.security = "Security fee required.";
        }

        if (!req.body.af_charges) {
            errors.af_charges = "AF Charges required.";
        }

        if (!req.body.anual) {
            errors.anual = "Annual fee required.";
        }

        if (!req.body.pu_charges) {
            errors.pu_charges = "PU Charges required.";
        }

        if (!req.body.cdf_dilp) {
            errors.cdf_dilp = "CDF/DILP required.";
        }
        if (!req.body.uni_examination) {
            errors.uni_examination = "Uni Examination Fee required.";
        }

        if (selectedRoll && Number(selectedRoll.course_id) === 1) {
            if (
                selectedRoll &&
                Number(selectedRoll.course_id) === 1 &&
                !req.body.practical
            ) {
                errors.practical = "Practical fee required.";
            }
            if (!req.body.computer_science) {
                errors.computer_science = "Computer Science Fee required.";
            }
            if (!req.body.home_science) {
                errors.home_science = "Home Science Fee required.";
            }
            if (!req.body.fine_arts) {
                errors.fine_arts = "Fine Arts Fee required.";
            }
            if (!req.body.music_instrumnet) {
                errors.music_instrumnet = "Music Instrument Fee required.";
            }
            if (!req.body.music_vocal) {
                errors.music_vocal = "Music Vocal Fee required.";
            }
            if (!req.body.english_honour) {
                errors.english_honour = "English Honours Fee required.";
            }
        }

        if (Object.keys(errors).length === 0) {

            olddetail = await UserModel.getSingleRecord(
                'roll_no',
                { id: course },
                '*'
            );


            const addData = {
                course_id: olddetail.course_id,
                year: olddetail.year,
                admission: olddetail.admission,
                tution: olddetail.tution,
                security: olddetail.security,
                af_charges: olddetail.af_charges,
                anual: olddetail.anual,
                pu_charges: olddetail.pu_charges,
                cdf_dilp: olddetail.cdf_dilp,
                uni_examination: olddetail.uni_examination,
                computer_science: olddetail.computer_science || 0,
                home_science: olddetail.home_science || 0,
                fine_arts: olddetail.fine_arts || 0,
                music_instrumnet: olddetail.music_instrumnet || 0,
                music_vocal: olddetail.music_vocal || 0,
                english_honour: olddetail.english_honour || 0,
                practical: olddetail.practical || 0
            };

            await UserModel.addRecord(
                'fess_update_details',
                addData
            );
            const updateData = {
                admission: req.body.admission,
                tution: req.body.tution,
                security: req.body.security,
                af_charges: req.body.af_charges,
                anual: req.body.anual,
                pu_charges: req.body.pu_charges,
                cdf_dilp: req.body.cdf_dilp,
                uni_examination: req.body.uni_examination,
                computer_science: req.body.computer_science,
                home_science: req.body.home_science,
                fine_arts: req.body.fine_arts,
                music_instrumnet: req.body.music_instrumnet,
                music_vocal: req.body.music_vocal,
                english_honour: req.body.english_honour
            };

            if (selectedRoll && Number(selectedRoll.course_id) === 1) {
                updateData.practical = req.body.practical;
            }

            await UserModel.updateRecord(
                "roll_no",
                updateData,
                { id: course }
            );

            message = "Fees Updated Successfully.";
            messageType = "success";

            selectedRoll = await UserModel.getSingleRecord(
                "roll_no",
                { id: course },
                "*"
            );
        }
    }

    let courseOptions = `<option value="">Select Course</option>`;

    for (const item of courseList) {

        const name = await UserModel.getSingleRecord(
            "courses",
            { id: item.course_id },
            "*"
        );

        courseOptions += `
        <option value="${item.id}" ${course == item.id ? 'selected' : ''}>
            ${name.course_name} ${item.year} Year
        </option>
        
    `;

    }
    let yearFields = '';
    // console.log(selectedRoll);

    if (selectedRoll) {

        yearFields += `

    <div class="col-md-3 mb-3">
        <label>Admission</label>
        <input type="text"
            class="form-control"
            name="admission"
            value="${selectedRoll.admission || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.admission ? `<div class="text-danger small mt-1">${errors.admission}</div>` : ""}
    </div>

    <div class="col-md-3 mb-3">
        <label>Tution</label>
        <input type="text"
            class="form-control"
            name="tution"
            value="${selectedRoll.tution || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.tution ? `<div class="text-danger small mt-1">${errors.tution}</div>` : ""}
    </div>

    <div class="col-md-3 mb-3">
        <label>Security</label>
        <input type="text"
            class="form-control"
            name="security"
            value="${selectedRoll.security || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.security ? `<div class="text-danger small mt-1">${errors.security}</div>` : ""}
    </div>
    `;

        if (Number(selectedRoll.course_id) === 1) {

            yearFields += `
        <div class="col-md-3 mb-3">
            <label>Practical Fees</label>
            <input type="text"
                class="form-control"
                name="practical"
                value="${selectedRoll.practical || ''}"
                oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            ${errors.practical ? `<div class="text-danger small mt-1">${errors.practical}</div>` : ""}
        </div>
        <div class="col-md-3 mb-3">
        <label>Computer Science</label>
        <input type="text"
            class="form-control"
            name="computer_science"
            value="${selectedRoll.computer_science || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.computer_science ? `<div class="text-danger small mt-1">${errors.computer_science}</div>` : ""}
    </div>
    <div class="col-md-3 mb-3">
        <label>Home Science</label>
        <input type="text"
            class="form-control"
            name="home_science"
            value="${selectedRoll.home_science || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.home_science ? `<div class="text-danger small mt-1">${errors.home_science}</div>` : ""}
    </div>
    <div class="col-md-3 mb-3">
        <label>Fine Arts</label>
        <input type="text"
            class="form-control"
            name="fine_arts"
            value="${selectedRoll.fine_arts || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.fine_arts ? `<div class="text-danger small mt-1">${errors.fine_arts}</div>` : ""}
    </div>
    <div class="col-md-3 mb-3">
        <label>Music Instrument</label>
        <input type="text"
            class="form-control"
            name="music_instrumnet"
            value="${selectedRoll.music_instrumnet || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.music_instrumnet ? `<div class="text-danger small mt-1">${errors.music_instrumnet}</div>` : ""}
    </div>
    <div class="col-md-3 mb-3">
        <label>Music Vocal</label>
        <input type="text"
            class="form-control"
            name="music_vocal"
            value="${selectedRoll.music_vocal || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.music_vocal ? `<div class="text-danger small mt-1">${errors.music_vocal}</div>` : ""}
    </div>
    <div class="col-md-3 mb-3">
        <label>English Honours</label>
        <input type="text"
            class="form-control"
            name="english_honour"
            value="${selectedRoll.english_honour || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.english_honour ? `<div class="text-danger small mt-1">${errors.english_honour}</div>` : ""}
    </div>
        `;
        }

        yearFields += `

    <div class="col-md-3 mb-3">
        <label>AF Charges</label>
        <input type="text"
            class="form-control"
            name="af_charges"
            value="${selectedRoll.af_charges || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.af_charges ? `<div class="text-danger small mt-1">${errors.af_charges}</div>` : ""}
    </div>

    <div class="col-md-3 mb-3">
        <label>Annual</label>
        <input type="text"
            class="form-control"
            name="anual"
            value="${selectedRoll.anual || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.anual ? `<div class="text-danger small mt-1">${errors.anual}</div>` : ""}
    </div>

    <div class="col-md-3 mb-3">
        <label>PU Charges</label>
        <input type="text"
            class="form-control"
            name="pu_charges"
            value="${selectedRoll.pu_charges || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.pu_charges ? `<div class="text-danger small mt-1">${errors.pu_charges}</div>` : ""}
    </div>

    <div class="col-md-3 mb-3">
        <label>CDF DILP</label>
        <input type="text"
            class="form-control"
            name="cdf_dilp"
            value="${selectedRoll.cdf_dilp || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.cdf_dilp ? `<div class="text-danger small mt-1">${errors.cdf_dilp}</div>` : ""}
    </div>

    <div class="col-md-3 mb-3">
        <label>Uni Examination</label>
        <input type="text"
            class="form-control"
            name="uni_examination"
            value="${selectedRoll.uni_examination || ''}"
            oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.uni_examination ? `<div class="text-danger small mt-1">${errors.uni_examination}</div>` : ""}
    </div>
    

    `;
    }

    const fields = `

    <div class="row">

        <div class="col-md-6">

            <label>Course</label>

            <select
                name="course"
                id="course"
                class="form-control"
                onchange="receiptHeadLoad()">

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

    const buttons = selectedRoll ? `
            <button
                type="submit"
                class="btn btn-dark"
                onclick="return receiptHeadUpdate()">
                Update Head
            </button>
        `
        : '';

    return View.Rview(res, "forms", {
        title: "Reciept Heads Update",
        action: CONSTANTS.role + "update-reciept-heads",
        method: "POST",
        message,
        messageType,
        fields,
        buttons

    });

};