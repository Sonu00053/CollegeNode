const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');

exports.dashboard = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await UserModel.getSingleRecord(
            'staff',
            { email: email },
            '*'
        );
        const students = await UserModel.getSingleRecord(
            'students',
            {},
            'count(id) as total'
        );
        return View.Rview(res, 'dashboard', {
            user: user,
            students: students.total,
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
            <th>Joining Date & Time</th>
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

        const profile = '<a href="' + CONSTANTS.role + 'profile/' + u.student_id + '" class="btn btn-sm btn-warning">View Profile</a>';

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
            <td>${SuperHelper.formatDate(u.created_at)}</td>
            <td>${profile}</td>

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

    return View.Rview(res, 'reports', {

        title: `
        <div class="d-flex justify-content-between">
            <span>All Students Report</span>
        </div>
        `,

        thead,
        tableRows

    });

};


exports.reciptcreate = async (req, res) => {
    const staff_id = req.user.staff_id;
    // console.log(staff_id);
    const errors = {};
    let student_id = req.query.student_id || '';
    let amount = '', payment_mode = '', transaction_id = '', remarks = '';
    let message = '', messageType = '';
    let rediret = '';
    if (student_id) {
        redirect = CONSTANTS.role + 'create-reciept?student_id=' + student_id;
    } else {
        redirect = CONSTANTS.role + 'create-reciept';
    }
    console.log(rediret);

    if (req.method === 'POST') {
        student_id = req.body.student_id || '';
        ({ amount = '', payment_mode = '', transaction_id = '', remarks='' } = req.body);
        errors.student_id = !student_id
            ? 'Student ID field required'
            : '';

        errors.amount = !amount
            ? 'Amount field required'
            : !/^\d+$/.test(amount)
                ? 'Only digits allowed'
                : '';

        errors.payment_mode = !payment_mode
            ? 'Payment Mode field required'
            : '';
        // errors.remarks = !remarks
        //     ? 'Remarks field required'
        //     : '';

        if (payment_mode !== 'Cash' && !transaction_id) {
            errors.transaction_id = 'This field is required';
        }
        var redirectUrl = CONSTANTS.role + 'create-reciept'; // Default redirect URL

        Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);

        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {
            const receipt_no = await exports.generaterecieptId();
            const students = await UserModel.getSingleRecord(
                'students',
                { student_id: student_id },
                '*'
            );
            if (students) {
                if (Number(students.reciept_status) == 0) {
                    if (Number(students.pending_fees) < Number(students.total_fees)) {
                        let remainingfees = Number(students.total_fees) - Number(students.pending_fees);

                        if (Number(amount) <= remainingfees) {
                            const availableFees = Number(students.available_fees);
                            var start = students.start;
                             var end = students.end;
                            await UserModel.addRecord('receipt_details', {
                                student_id,
                                receipt_no,
                                amount,
                                remarks,
                                total_fees: Number(students.total_fees),
                                available_fees: availableFees,
                                payment_mode,
                                transaction_id,
                                course_id: students.course,
                                year: students.course_year,
                                staff_id,
                                start,
                                end
                            });
                            await UserModel.updateRecord(
                                'students',
                                {
                                    pending_fees: Number(students.pending_fees) + Number(amount), reciept_status: 1, available_fees: (availableFees - Number(amount))
                                },
                                {
                                    student_id: student_id
                                }
                            );
                            message = 'Receipt created successfully!';
                            messageType = 'success';
                            student_id = '';
                            amount = '';
                            payment_mode = '';
                            transaction_id = '';
                            return res.redirect(
                                CONSTANTS.role + 'reciept/' + receipt_no
                            );
                            // var redirectUrl = CONSTANTS.role + 'reciept/' + receipt_no; // Redirect to the receipt page
                        } else {
                            message = `Remaining fees is ${CONSTANTS.currency}${remainingfees}. Amount cannot exceed remaining fees.`;
                            messageType = 'error';


                        }
                    } else {
                        messageType = 'error';
                        message = 'Fees already paid in full. No pending fees remaining.';
                    }
                } else {
                    messageType = 'error';
                    message = 'Admission Reciept Already Created';
                }
            } else {
                messageType = 'error';
                message = 'Invalid Student ID!';
            }
        }
    }
    let student = null;

    if (student_id) {
        student = await UserModel.getSingleRecord(
            "students",
            { student_id },
            "student_id,total_fees,pending_fees,first_name,last_name"
        );
    }
    const fields = `
        ${Form.label("Student ID")}
        ${Form.text("student_id", student_id, {
        class: `form-control ${errors.student_id ? "is-invalid" : ""}`,
        placeholder: "Enter Student ID",
        onkeyup: "loadStudentDetails()"
    })}
        ${errors.student_id ? `<div class="text-danger small mt-1">${errors.student_id}</div>` : ""}
        <div id="studentDetails"></div>

        

        ${Form.label("Amount")}
        <input type="text"
               name="amount"
               value="${amount}"
               class="form-control ${errors.amount ? "is-invalid" : ""}"
               placeholder="Enter Amount"
               oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.amount ? `<div class="text-danger small mt-1">${errors.amount}</div>` : ""}

        ${Form.label("Payment Mode")}
        <select name="payment_mode"
                id="payment_mode"
                class="form-control ${errors.payment_mode ? "is-invalid" : ""}"
                onchange="togglePaymentField()">
            <option value="">Select Payment Mode</option>
            <option value="Cash" ${payment_mode === "Cash" ? "selected" : ""}>Cash</option>
            <option value="UPI" ${payment_mode === "UPI" ? "selected" : ""}>UPI</option>
            <option value="Card" ${payment_mode === "Card" ? "selected" : ""}>Card</option>
            <option value="Bank Transfer" ${payment_mode === "Bank Transfer" ? "selected" : ""}>Bank Transfer</option>
            <option value="Cheque" ${payment_mode === "Cheque" ? "selected" : ""}>Cheque</option>
        </select>
        ${errors.payment_mode ? `<div class="text-danger small mt-1">${errors.payment_mode}</div>` : ""}

        ${Form.label("Remarks")}
<textarea
    name="remarks"
    class="form-control ${errors.remarks ? "is-invalid" : ""}"
    placeholder="Enter Remarks"
    rows="3">${remarks}</textarea>

${errors.remarks ? `<div class="text-danger small mt-1">${errors.remarks}</div>` : ""}

        <div id="payment_details_div" style="display:none;" class="mt-3">
            <label id="payment_details_label"></label>
            <input type="text"
                   name="transaction_id"
                   id="payment_details"
                   value="${transaction_id}"
                   class="form-control ${errors.transaction_id ? "is-invalid" : ""}">
            ${errors.transaction_id ? `<div class="text-danger small mt-1">${errors.transaction_id}</div>` : ""}
        </div>
       

        <script>
       
        function togglePaymentField() {
            const mode = document.getElementById('payment_mode').value;
            const div = document.getElementById('payment_details_div');
            const label = document.getElementById('payment_details_label');
            const input = document.getElementById('payment_details');

            if (mode === 'Cash' || mode === '') {
                div.style.display = 'none';
                input.value = '';
            } else {
                div.style.display = 'block';

                if (mode === 'UPI') {
                    label.innerText = 'Transaction ID';
                    input.placeholder = 'Enter Transaction ID';
                } else if (mode === 'Card') {
                    label.innerText = 'Card Number';
                    input.placeholder = 'Enter Card Number';
                } else if (mode === 'Bank Transfer') {
                    label.innerText = 'Transfer Reference No';
                    input.placeholder = 'Enter Transfer Reference No';
                } else if (mode === 'Cheque') {
                    label.innerText = 'Cheque Number';
                    input.placeholder = 'Enter Cheque Number';
                }
            }
        }

        document.addEventListener('DOMContentLoaded', togglePaymentField);
        </script>
    `;

    const buttons = `
        ${Form.submit("Create Receipt", {
        class: "btn btn-dark"
    })}
    `;

    const response = {
        title: 'Create Admission Student Receipt',
        action: CONSTANTS.role + 'create-reciept',
        redirect: rediret,
        studentFeesUrl: CONSTANTS.role + 'student-fees',
        currency: CONSTANTS.currency,
        method: 'POST',
        message,
        messageType,
        errors,
        fields,
        redirectUrl,
        buttons
    };

    return View.Rview(res, 'reciept2', response);
};

exports.generaterecieptId = async () => {
    const lastReceipt = await UserModel.getSingleRecord(
        'receipt_details',
        {},
        'receipt_no',
        'id DESC'
    );

    if (!lastReceipt || !lastReceipt.receipt_no) {
        return 1;
    }
    return Number(lastReceipt.receipt_no) + 1;
};

exports.reciept = async (req, res) => {
    try {
        return View.Rview(res, 'reciept'
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.recieptHistory = async (req, res) => {

    const result = await UserModel.getRecords('receipt_details', {}, '*');

    const thead = `
        <tr>
            <th>#</th>
            <th>Receipt No</th>
            <th>Student ID</th>
            <th>Amount</th>
            <th>Payment Mode</th>
            <th>Date</th>
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
                <td>${CONSTANTS.currency}${u.amount}</td>
                <td>${u.payment_mode}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
                <td>
                    <a href="${CONSTANTS.role}reciept/${u.receipt_no}"
                       class="btn btn-sm btn-primary">
                       View Receipt
                    </a>
                </td>
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

    const action = `
        <a href="${CONSTANTS.role}create-reciept" class="btn btn-warning">
            Create Receipt
        </a>
    `;

    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>Receipt History</span>
                ${action}
            </div>
        `,
        thead,
        tableRows,
    });

};

exports.studentFees = async (req, res) => {

    const student = await UserModel.getSingleRecord(
        "students",
        { student_id: req.body.student_id },
        "total_fees,pending_fees,first_name,last_name,father_name,course,course_year"
    );
    const course = await UserModel.getSingleRecord(
        "courses",
        { id: student.course },
        "course_name"
    );

    if (!student) {
        return res.json({
            status: false
        });
    }

    return res.json({
        status: true,
        total_fees: student.total_fees,
        name: student.first_name + ' ' + student.last_name,
        father: student.father_name,
        course: course.course_name + ' - ' + student.course_year,
        paid_fees: student.pending_fees,
        pending_fees: Number(student.total_fees) - Number(student.pending_fees)
    });

};





exports.reciept = async (req, res) => {
    const receipt = await UserModel.getSingleRecord(
        'receipt_details',
        { receipt_no: req.params.id }, '*'
    );
    const user = await UserModel.getSingleRecord(
        'students',
        { student_id: receipt.student_id }, '*'
    );

    const course = await UserModel.getSingleRecord(
        'courses',
        { id: user.course }, '*'
    );
    // console.log('receipt', receipt);
    // console.log('name', name);
    var totalFees = Number(user.total_fees);
    var PendingFess = (Number(user.total_fees) - Number(user.pending_fees));
    var dueamount = (Number(receipt.available_fees));
    var balance = dueamount - (receipt.amount);

   
    const receiptHead = await UserModel.getSingleRecord(
        'roll_no',
        {
            course_id: user.course,
            year: user.course_year
        },
        '*'
    );

    var start = receipt.start;
    var end = String(receipt.end).slice(-2);

    let subjects = '';

    if (user.subject_ids) {
        const ids = JSON.parse(user.subject_ids);

        for (const id of ids) {
            const subject = await UserModel.getSingleRecord(
                'subjects',
                { id },
                'subject_name'
            );

            if (subject) {
                subjects += `<span class="badge bg-light text-dark border me-1">${subject.subject_name}</span>`;
            }
        }
    }

    let feeRows = `
        <div class="d-flex m-0 justify-content-between"><p class="m-0">Examination Fees</p><p class="text-end m-0">${receiptHead.uni_examination}</p></div>
        <div class="d-flex m-0 justify-content-between"><p class="m-0">Admission Fees</p><p class="text-end m-0">${receiptHead.admission}</p></div>
        <div class="d-flex m-0 justify-content-between"><p class="m-0">Tuition Fees</p><p class="text-end m-0">${receiptHead.tution}</p></div>
    `;

    // Practical sirf practical_status = 1 par
    if (Number(user.total_practical_fees) > 0) {
        feeRows += `
            <div class="d-flex m-0 justify-content-between">
                <p class="m-0">Practical Fees</p>
                <p class="text-end m-0">${user.total_practical_fees}</p>
            </div>
        `;
    }

    if (Number(user.security) > 0) {
        feeRows += `
          <div class="d-flex m-0 justify-content-between">
                <p class="m-0">College Security</td>
                <p class="text-end m-0">${user.security}</td>
           </div>
        `;
    }



    feeRows += `
        <div class="d-flex m-0 justify-content-between"><p class="m-0">A.F. Charges</p><p class="text-end m-0">${receiptHead.af_charges}</p></div>
        <div class="d-flex m-0 justify-content-between"><p class="m-0">Annual Charges</p><p class="text-end m-0">${receiptHead.anual}</p></div>
        <div class="d-flex m-0 justify-content-between"><p class="m-0">Other PU Charges</p><p class="text-end m-0">${receiptHead.pu_charges}</p></div>
        <div class="d-flex m-0 justify-content-between"><p class="m-0">CDF & DILP</p><p class="text-end m-0">${receiptHead.cdf_dilp}</p></div>
    `;
    if (Number(user.parking_fees) > 0) {
        feeRows += `
          <div class="d-flex m-0 justify-content-between">
                <p class="m-0">Parking Fees</td>
                <p class="text-end m-0">${user.parking_fees}</td>
           </div>
        `;
    }
    const amountInWords = SuperHelper.numberToWords(receipt.amount);
    let paymentRow = '';

    if (receipt.payment_mode === 'Cash') {
        paymentRow = `
        <div class="d-flex m-0 justify-content-between">
            <p class="m-0">CASH RECEIVED</p>
            <p class="text-end m-0">${receipt.amount}</p>
        </div>
    `;
    } else {
        paymentRow = `
        <div class="d-flex m-0 justify-content-between">
            <p class="m-0">${receipt.payment_mode.toUpperCase()} (${receipt.transaction_id})</td>
            <p class="text-end m-0">${receipt.amount}</td>
        </div>
    `;
    }
    return View.Rview(res, 'admission', {
        receipt,
        user,
        start,
        end,
        course,
        balance,
        paymentRow,
        feeRows,
        subjects,
        dueamount,
        // PendingFess,
        amountInWords,
        receipt_date: SuperHelper.formatDate(receipt.created_at),
        appId: String(SuperHelper.formatDate(receipt.created_at)),
        name: user.first_name + ' ' + user.last_name

    });

};






exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true
    });

    return res.redirect(CONSTANTS.role + 'login');
};


exports.getSubjectNames = async (req, res) => {
    try {
        let { subject_ids } = req.body;

        if (!subject_ids || subject_ids.length === 0) {
            return res.json({
                status: true,
                subjects: []
            });
        }

        // Agar string aayi ho to parse kar lo
        if (typeof subject_ids === 'string') {
            subject_ids = JSON.parse(subject_ids);
        }

        const subjects = [];

        for (const id of subject_ids) {
            const subject = await UserModel.getSingleRecord(
                'subjects',
                { id },
                'id, subject_name'
            );

            if (subject) {
                subjects.push(subject);
            }
        }

        return res.json({
            status: true,
            subjects
        });

    } catch (err) {
        console.log(err);
        return res.json({
            status: false,
            message: 'Something went wrong'
        });
    }
};


exports.recieptHistoryToday = async (req, res) => {

    // Sirf aaj ki receipts
    const rows = await UserModel.getTodayRecords(
        'receipt_details',
        '*',
        'created_at',
        'created_at ASC'
    );

    // Summary
    const todayCount = rows.length;

    const todayAmount = rows.reduce((sum, r) => {
        return sum + Number(r.amount || 0);
    }, 0);

    const thead = `
        <tr>
            <th>#</th>
            <th>Reciept No</th>
            <th>Student ID</th>
            <th>Amount</th>
            <th>Payment Mode</th>
            <th>Date & Time</th>
            <th>Action</th>
        </tr>
    `;

    let tableRows = '';

    for (const [index, u] of rows.entries()) {

        tableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${u.receipt_no}</td>
                <td>${u.student_id}</td>
                <td>${CONSTANTS.currency}${u.amount}</td>
                <td>${u.payment_mode}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
                <td>
                    <a href="${CONSTANTS.role}reciept/${u.id}"
                        class="btn btn-sm btn-primary">
                        View Receipt
                    </a>
                </td>
            </tr>
        `;
    }

    if (!rows.length) {
        tableRows = `
            <tr>
                <td colspan="6" class="text-center">
                    No Today's Receipt Found
                </td>
            </tr>
        `;
    }

    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>Daily Cash Summary</span>

                <div>
                    <span class="badge bg-success me-2">
                        Total Receipts : ${todayCount}
                    </span>

                    <span class="badge bg-primary">
                        Today Cash : ${CONSTANTS.currency}${todayAmount}
                    </span>
                </div>
            </div>
        `,
        thead,
        tableRows,
    });

};





exports.balancereciptcreate = async (req, res) => {
    const staff_id = req.user.staff_id;
    const errors = {};
    let student_id = req.query.student_id || '';
    let amount = '', payment_mode = '', transaction_id = '', remarks = '';
    let message = '', messageType = '';
    let rediret = '';
    if (student_id) {
        redirect = CONSTANTS.role + 'create-reciept?student_id=' + student_id;
    } else {
        redirect = CONSTANTS.role + 'balance-create-reciept';
    }
    console.log(rediret);

    if (req.method === 'POST') {
        student_id = req.body.student_id || '';
        ({ amount = '', payment_mode = '', transaction_id = '', remarks='' } = req.body);
        errors.student_id = !student_id
            ? 'Student ID field required'
            : '';

        errors.amount = !amount
            ? 'Amount field required'
            : !/^\d+$/.test(amount)
                ? 'Only digits allowed'
                : '';

        errors.payment_mode = !payment_mode
            ? 'Payment Mode field required'
            : '';
        // errors.remarks = !remarks
        //     ? 'Remarks field required'
        //     : '';

        if (payment_mode !== 'Cash' && !transaction_id) {
            errors.transaction_id = 'This field is required';
        }
        var redirectUrl = CONSTANTS.role + 'create-reciept'; // Default redirect URL

        Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);

        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {
            const receipt_no = await exports.generatebalancerecieptId();
            const students = await UserModel.getSingleRecord(
                'students',
                { student_id: student_id },
                '*'
            );
            if (students) {
                if (Number(students.reciept_status) == 1) {
                    if (Number(students.pending_fees) < Number(students.total_fees)) {
                        let remainingfees = Number(students.total_fees) - Number(students.pending_fees);

                        if (Number(amount) <= remainingfees) {
                             var start = students.start;
                             var end = students.end;
                            const availableFees = Number(students.available_fees);
                            await UserModel.addRecord('balance_receipt_details', {
                                student_id,
                                receipt_no,
                                roll_no: students.roll_no,
                                total_fees: Number(students.total_fees),
                                available_fees: availableFees,
                                amount,
                                course_id: students.course,
                                year: students.course_year,
                                remarks,
                                payment_mode,
                                transaction_id,
                                staff_id,
                                start,
                                end
                            });
                            await UserModel.updateRecord(
                                'students',
                                {
                                    pending_fees: Number(students.pending_fees) + Number(amount), reciept_status: 1, available_fees: (availableFees - Number(amount))
                                },
                                {
                                    student_id: student_id
                                }
                            );
                            message = 'Receipt created successfully!';
                            messageType = 'success';
                            student_id = '';
                            amount = '';
                            payment_mode = '';
                            transaction_id = '';
                            return res.redirect(
                                CONSTANTS.role + 'balance-reciept/' + receipt_no
                            );
                            // var redirectUrl = CONSTANTS.role + 'reciept/' + receipt_no; // Redirect to the receipt page
                        } else {
                            message = `Remaining fees is ${CONSTANTS.currency}${remainingfees}. Amount cannot exceed remaining fees.`;
                            messageType = 'error';


                        }
                    } else {
                        messageType = 'error';
                        message = 'Fees already paid in full. No pending fees remaining.';
                    }
                } else {
                    messageType = 'error';
                    message = 'Please create the Admission Receipt first.';
                }
            } else {
                messageType = 'error';
                message = 'Invalid Student ID!';
            }
        }
    }
    let student = null;

    if (student_id) {
        student = await UserModel.getSingleRecord(
            "students",
            { student_id },
            "student_id,total_fees,pending_fees,first_name,last_name"
        );
    }
    const fields = `
        ${Form.label("Student ID *")}
        ${Form.text("student_id", student_id, {
        class: `form-control ${errors.student_id ? "is-invalid" : ""}`,
        placeholder: "Enter Student ID",
        onkeyup: "loadStudentDetails()"
    })}
        ${errors.student_id ? `<div class="text-danger small mt-1">${errors.student_id}</div>` : ""}
        <div id="studentDetails"></div>

        

        ${Form.label("Amount *")}
        <input type="text"
               name="amount"
               value="${amount}"
               class="form-control ${errors.amount ? "is-invalid" : ""}"
               placeholder="Enter Amount"
               oninput="this.value=this.value.replace(/[^0-9]/g,'')">
        ${errors.amount ? `<div class="text-danger small mt-1">${errors.amount}</div>` : ""}

        ${Form.label("Payment Mode *")}
        <select name="payment_mode"
                id="payment_mode"
                class="form-control ${errors.payment_mode ? "is-invalid" : ""}"
                onchange="togglePaymentField()">
            <option value="">Select Payment Mode</option>
            <option value="Cash" ${payment_mode === "Cash" ? "selected" : ""}>Cash</option>
            <option value="UPI" ${payment_mode === "UPI" ? "selected" : ""}>UPI</option>
            <option value="Card" ${payment_mode === "Card" ? "selected" : ""}>Card</option>
            <option value="Bank Transfer" ${payment_mode === "Bank Transfer" ? "selected" : ""}>Bank Transfer</option>
            <option value="Cheque" ${payment_mode === "Cheque" ? "selected" : ""}>Cheque</option>
        </select>
        ${errors.payment_mode ? `<div class="text-danger small mt-1">${errors.payment_mode}</div>` : ""}

        ${Form.label("Remarks")}
<textarea
    name="remarks"
    class="form-control ${errors.remarks ? "is-invalid" : ""}"
    placeholder="Enter Remarks"
    rows="3">${remarks}</textarea>

${errors.remarks ? `<div class="text-danger small mt-1">${errors.remarks}</div>` : ""}

        <div id="payment_details_div" style="display:none;" class="mt-3">
            <label id="payment_details_label"></label>
            <input type="text"
                   name="transaction_id"
                   id="payment_details"
                   value="${transaction_id}"
                   class="form-control ${errors.transaction_id ? "is-invalid" : ""}">
            ${errors.transaction_id ? `<div class="text-danger small mt-1">${errors.transaction_id}</div>` : ""}
        </div>
       

        <script>
       
        function togglePaymentField() {
            const mode = document.getElementById('payment_mode').value;
            const div = document.getElementById('payment_details_div');
            const label = document.getElementById('payment_details_label');
            const input = document.getElementById('payment_details');

            if (mode === 'Cash' || mode === '') {
                div.style.display = 'none';
                input.value = '';
            } else {
                div.style.display = 'block';

                if (mode === 'UPI') {
                    label.innerText = 'Transaction ID';
                    input.placeholder = 'Enter Transaction ID';
                } else if (mode === 'Card') {
                    label.innerText = 'Card Number';
                    input.placeholder = 'Enter Card Number';
                } else if (mode === 'Bank Transfer') {
                    label.innerText = 'Transfer Reference No';
                    input.placeholder = 'Enter Transfer Reference No';
                } else if (mode === 'Cheque') {
                    label.innerText = 'Cheque Number';
                    input.placeholder = 'Enter Cheque Number';
                }
            }
        }

        document.addEventListener('DOMContentLoaded', togglePaymentField);
        </script>
    `;

    const buttons = `
        ${Form.submit("Create Receipt", {
        class: "btn btn-dark"
    })}
    `;

    const response = {
        title: 'Create Balance Student Receipt',
        action: CONSTANTS.role + 'balance-create-reciept',
        redirect: rediret,
        studentFeesUrl: CONSTANTS.role + 'student-fees',
        currency: CONSTANTS.currency,
        method: 'POST',
        message,
        messageType,
        errors,
        fields,
        redirectUrl,
        buttons
    };

    return View.Rview(res, 'reciept2', response);
};

exports.generatebalancerecieptId = async () => {
    const lastReceipt = await UserModel.getSingleRecord(
        'balance_receipt_details',
        {},
        'receipt_no',
        'id DESC'
    );

    if (!lastReceipt || !lastReceipt.receipt_no) {
        return 1;
    }
    return Number(lastReceipt.receipt_no) + 1;
};


exports.balancereciept = async (req, res) => {
    const receipt = await UserModel.getSingleRecord(
        'balance_receipt_details',
        { receipt_no: req.params.id }, '*'
    );
    const user = await UserModel.getSingleRecord(
        'students',
        { student_id: receipt.student_id }, '*'
    );

    const course = await UserModel.getSingleRecord(
        'courses',
        { id: user.course }, '*'
    );
    var totalFees = Number(user.total_fees);
    var PendingFess = (Number(user.total_fees) - Number(user.pending_fees));
    var dueamount = (Number(receipt.available_fees));
    var balance = dueamount - (receipt.amount);

    const session = await UserModel.getSingleRecord(
        'session_update',
        { id: 1 }, '*'
    );
    const receiptHead = await UserModel.getSingleRecord(
        'roll_no',
        {
            course_id: user.course,
            year: user.course_year
        },
        '*'
    );

    var start = session.start;
    var end = String(session.end).slice(-2);

    let subjects = '';

    if (user.subject_ids) {
        const ids = JSON.parse(user.subject_ids);

        for (const id of ids) {
            const subject = await UserModel.getSingleRecord(
                'subjects',
                { id },
                'subject_name'
            );

            if (subject) {
                subjects += `<span class="badge bg-light text-dark border me-1">${subject.subject_name}</span>`;
            }
        }
    }

    const amountInWords = SuperHelper.numberToWords(receipt.amount);
    let paymentRow = '';

    if (receipt.payment_mode === 'Cash') {
        paymentRow = `
        <div class="d-flex m-0 justify-content-between">
            <p class="m-0">CASH RECEIVED</p>
            <p class="text-end m-0">${receipt.amount}</p>
        </div>
    `;
    } else {
        paymentRow = `
        <div class="d-flex m-0 justify-content-between">
            <p class="m-0">${receipt.payment_mode.toUpperCase()} (${receipt.transaction_id})</td>
            <p class="text-end m-0">${receipt.amount}</td>
        </div>
    `;
    }
    return View.Rview(res, 'balance_reciept', {
        receipt,
        user,
        start,
        end,
        course,
        balance,
        paymentRow,
        subjects,
        dueamount,
        amountInWords,
        receipt_date: SuperHelper.formatDate(receipt.created_at),
        appId: String(SuperHelper.formatDate(receipt.created_at)),
        name: user.first_name + ' ' + user.last_name

    });

};


exports.groupbyrecipthistory = async (req, res) => {

    const result = await UserModel.getGroupByDate(
        'receipt_details',
        'created_at',
        'amount'
    );
    console.log(result);

    const thead = `
        <tr>
            <th>#</th>
            <th>Date</th>
            <th>Total Receipts</th>
            <th>Total Amount</th>
            <th>Cash</th>
            <th>Online</th>
           
            <th>Action</th>
        </tr>
    `;
    let tableRows = '';
    for (const [index, row] of result.entries()) {
        const date = new Date(row.group_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const newdate = `${year}-${month}-${day}`;
        const cashsum = await UserModel.getSingleRecorddate(
            'receipt_details',
            {
                created_at: newdate,
                payment_mode: 'Cash'
            },
            'IFNULL(SUM(amount),0) AS total'
        );
        const online = await UserModel.getSingleRecorddate(
            'receipt_details',
            {
                created_at: newdate,
                payment_mode: {
                    operator: '!=',
                    value: 'Cash'
                },
            },
            'IFNULL(SUM(amount),0) AS total'
        );
        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${newdate}</td>
            <td>${row.total_records}</td>
            <td>${CONSTANTS.currency}${row.total_amount}</td>
            <td>${CONSTANTS.currency}${cashsum.total}</td>
            <td>${CONSTANTS.currency}${online.total}</td>
            <td>
                <a href="${CONSTANTS.role}view-reciept-history/${newdate}"
                   class="btn btn-sm btn-primary">
                    View
                </a>
            </td>
        </tr>
    `;
    }

    if (!result.length) {
        tableRows = `
            <tr>
                <td colspan="5" class="text-center">No Data Found</td>
            </tr>
        `;
    }

    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>Receipt History (Date Wise)</span>
               
            </div>
        `,
        thead,
        tableRows
    });
};

exports.recieptHistorydatewisw = async (req, res) => {

    const date = req.params.date;


    // Sirf aaj ki receipts
    const rows = await UserModel.getRecordsNew(
        'receipt_details',
        {
            'DATE(created_at)': date
        },
        '*'
    );
    // console.log(rows);

    // Summary
    const todayCount = rows.length;

    const todayAmount = rows.reduce((sum, r) => {
        return sum + Number(r.amount || 0);
    }, 0);

    const thead = `
        <tr>
            <th>#</th>
            <th>Reciept No</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Roll No</th>
            <th>Amount</th>
            <th>Payment Mode</th>
            <th>Date & Time</th>
            <th>Action</th>
        </tr>
    `;
    let tableRows = '';
    for (const [index, u] of rows.entries()) {
        const studentDetail = await UserModel.getSingleRecorddate(
            'students',
            {
                student_id: u.student_id,
            },
            '*'
        );
        tableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${u.receipt_no}</td>
                <td>${u.student_id}</td>
                <td>${studentDetail.first_name} ${studentDetail.last_name}</td>
                <td>${studentDetail.roll_no}</td>
                <td>${CONSTANTS.currency}${u.amount}</td>
                <td>${u.payment_mode}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
                <td>
                    <a href="${CONSTANTS.role}reciept/${u.receipt_no}"
                        class="btn btn-sm btn-primary">
                        View Receipt
                    </a>
               
                </td>

            </tr>
        `;
    }

    if (!rows.length) {
        tableRows = `
            <tr>
                <td colspan="6" class="text-center">
                    No Today's Receipt Found
                </td>
            </tr>
        `;
    }

    //       <button
    //     class="btn btn-sm btn-warning editReceiptBtn"
    //     data-id="${u.id}"
    //     data-amount="${u.amount}"
    //     data-type="admission">
    //     Edit
    // </button>

    return View.Rview(res, 'popupreport', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>${date} Admission Reciepts History</span>

                
            </div>
        `,
        thead,
        tableRows,
    });

};


exports.balacegroupbyrecipthistory = async (req, res) => {

    // const rows = await UserModel.getReceiptHistoryByDate();
    const result = await UserModel.getGroupByDate(
        'balance_receipt_details',
        'created_at',
        'amount'
    );
    console.log(result);

    const thead = `
        <tr>
            <th>#</th>
            <th>Date</th>
            <th>Total Receipts</th>
            <th>Total Amount</th>
            <th>Cash</th>
            <th>Online</th>
           
            <th>Action</th>

        </tr>
    `;
    let tableRows = '';
    for (const [index, row] of result.entries()) {
        const date = new Date(row.group_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const newdate = `${year}-${month}-${day}`;
        const cashsum = await UserModel.getSingleRecorddate(
            'balance_receipt_details',
            {
                created_at: newdate,
                payment_mode: 'Cash'
            },
            'IFNULL(SUM(amount),0) AS total'
        );
        const online = await UserModel.getSingleRecorddate(
            'balance_receipt_details',
            {
                created_at: newdate,
                payment_mode: {
                    operator: '!=',
                    value: 'Cash'
                },
            },
            'IFNULL(SUM(amount),0) AS total'
        );
        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${newdate}</td>
            <td>${row.total_records}</td>
            <td>${CONSTANTS.currency}${row.total_amount}</td>
            <td>${CONSTANTS.currency}${cashsum.total}</td>
            <td>${CONSTANTS.currency}${online.total}</td>
            <td>
                <a href="${CONSTANTS.role}balance-view-reciept-history/${newdate}"
                   class="btn btn-sm btn-primary">
                    View
                </a>
               
            </td>
        </tr>
    `;
    }

    if (!result.length) {
        tableRows = `
            <tr>
                <td colspan="5" class="text-center">No Data Found</td>
            </tr>
        `;
    }

    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>Balance Receipt History (Date Wise)</span>
            </div>
        `,
        thead,
        tableRows
    });
};

exports.balancerecieptHistorydatewisw = async (req, res) => {

    const date = req.params.date;


    // Sirf aaj ki receipts
    const rows = await UserModel.getRecordsNew(
        'balance_receipt_details',
        {
            'DATE(created_at)': date
        },
        '*'
    );
    // console.log(rows);

    // Summary
    const todayCount = rows.length;

    const todayAmount = rows.reduce((sum, r) => {
        return sum + Number(r.amount || 0);
    }, 0);

    const thead = `
        <tr>
            <th>#</th>
            <th>Reciept No</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Roll No</th>
            <th>Amount</th>
            <th>Payment Mode</th>
            <th>Date & Time</th>
            <th>Action</th>
        </tr>
    `;

    let tableRows = '';

    for (const [index, u] of rows.entries()) {
        const studentDetail = await UserModel.getSingleRecorddate(
            'students',
            {
                student_id: u.student_id,

            },
            '*'
        );

        tableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${u.receipt_no}</td>
                <td>${u.student_id}</td>
                <td>${studentDetail.first_name} ${studentDetail.last_name}</td>
                <td>${studentDetail.roll_no}</td>
                <td>${CONSTANTS.currency}${u.amount}</td>
                <td>${u.payment_mode}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
                <td>
                    <a href="${CONSTANTS.role}balance-reciept/${u.receipt_no}"
                        class="btn btn-sm btn-primary">
                        View Receipt
                    </a>
               
                </td>
            </tr>
        `;
    }

    if (!rows.length) {
        tableRows = `
            <tr>
                <td colspan="7" class="text-center">
                    No Today's Receipt Found
                </td>
            </tr>
        `;
    }
    //      <button
    //     class="btn btn-sm btn-warning editReceiptBtn"
    //     data-id="${u.id}"
    //     data-amount="${u.amount}"
    //     data-type="balance">
    //     Edit
    // </button>

    return View.Rview(res, 'popupreport', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>${date} Balance Reciepts History</span>

                
            </div>
        `,
        thead,
        tableRows,
    });

};


exports.reciptBothhistory = async (req, res) => {

    const thead = `
        <tr>
            <th>#</th>
            <th>Date</th>
            <th>Total Receipts</th>
            <th>Total Amount</th>
            <th>Cash</th>
            <th>Online</th>
        </tr>
    `;

    let tableRows = '';

    const startDate = new Date('2026-07-13');
    const endDate = new Date();
    let index = 1;
    for (
        let currentDate = new Date(endDate);
        currentDate >= startDate;
        currentDate.setDate(currentDate.getDate() - 1)
    ) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const newdate = `${year}-${month}-${day}`;
        const receipt = await UserModel.getSingleRecorddate(
            'receipt_details',
            { created_at: newdate },
            'COUNT(*) AS total_records, IFNULL(SUM(amount),0) AS total_amount'
        );

        const cashsum = await UserModel.getSingleRecorddate(
            'receipt_details',
            {
                created_at: newdate,
                payment_mode: 'Cash'
            },
            'IFNULL(SUM(amount),0) AS total'
        );

        const online = await UserModel.getSingleRecorddate(
            'receipt_details',
            {
                created_at: newdate,
                payment_mode: {
                    operator: '!=',
                    value: 'Cash'
                }
            },
            'IFNULL(SUM(amount),0) AS total'
        );

        // Balance Receipt Details
        const total_balance = await UserModel.getSingleRecorddate(
            'balance_receipt_details',
            { created_at: newdate },
            'COUNT(*) AS total_records,IFNULL(SUM(amount),0) AS total'
        );

        const cashsum_balance = await UserModel.getSingleRecorddate(
            'balance_receipt_details',
            {
                created_at: newdate,
                payment_mode: 'Cash'
            },
            'IFNULL(SUM(amount),0) AS total'
        );

        const online_balance = await UserModel.getSingleRecorddate(
            'balance_receipt_details',
            {
                created_at: newdate,
                payment_mode: {
                    operator: '!=',
                    value: 'Cash'
                }
            },
            'IFNULL(SUM(amount),0) AS total'
        );

        tableRows += `
            <tr>
                <td>${index++}</td>
                <td>${newdate}</td>
                <td>${Number(receipt.total_records) + Number(total_balance.total_records)}</td>
                <td>${CONSTANTS.currency}${Number(receipt.total_amount) + Number(total_balance.total)}</td>
                <td>${CONSTANTS.currency}${Number(cashsum.total) + Number(cashsum_balance.total)}</td>
                <td>${CONSTANTS.currency}${Number(online.total) + Number(online_balance.total)}</td>
            </tr>
        `;
    }

    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>Both Receipt History (Date Wise)</span>
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
        const admissionDate = new Date(user.created_at).toISOString().split('T')[0];
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
        return View.Rview(res, 'profile', {
            header: 'User Dashboard',
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
