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

        const headsView = '<a href="' + CONSTANTS.role + 'heads-detail/' + u.student_id + '" class="btn btn-sm btn-dark">View</a>';

        tableRows += `
        <tr>

            <td>${index + 1}</td>
            <td>${u.student_id}</td>
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
        errors.remarks = !remarks
            ? 'Remarks field required'
            : '';

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
                'pending_fees,total_fees'
            );
            if (students) {
                if (Number(students.pending_fees) < Number(students.total_fees)) {
                    let remainingfees = Number(students.total_fees) - Number(students.pending_fees);

                    if (Number(amount) <= remainingfees) {
                        await UserModel.addRecord('receipt_details', {
                            student_id,
                            receipt_no,
                            amount,
                            remarks,
                            payment_mode,
                            transaction_id
                        });
                        await UserModel.updateRecord(
                            'students',
                            {
                                pending_fees: Number(students.pending_fees) + Number(amount)
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
        title: 'Create Student Receipt',
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
        "total_fees,pending_fees"
    );

    if (!student) {
        return res.json({
            status: false
        });
    }

    return res.json({
        status: true,
        total_fees: student.total_fees,
        paid_fees: student.pending_fees,
        pending_fees: Number(student.total_fees) - Number(student.pending_fees)
    });

};





exports.reciept = async (req, res) => {

    const receipt = await UserModel.getSingleRecord(
        'receipt_details',
        { id: req.params.id }, '*'
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
    var dueamount = (Number(PendingFess) + (Number(receipt.amount)));
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

    let feeRows = `
        <tr><td>Examination Fees</td><td class="text-end">${receiptHead.uni_examination}</td></tr>
        <tr><td>Admission Fees</td><td class="text-end">${receiptHead.admission}</td></tr>
        <tr><td>Tuition Fees</td><td class="text-end">${receiptHead.tution}</td></tr>
        <tr><td>College Security</td><td class="text-end">${receiptHead.security}</td></tr>
    `;

    // Practical sirf practical_status = 1 par
    if (Number(user.practical_status) === 1) {
        feeRows += `
            <tr>
                <td>Practical Fees</td>
                <td class="text-end">${receiptHead.practical}</td>
            </tr>
        `;
    }

    feeRows += `
        <tr><td>A.F. Charges</td><td class="text-end">${receiptHead.af_charges}</td></tr>
        <tr><td>Annual Charges</td><td class="text-end">${receiptHead.anual}</td></tr>
        <tr><td>Other PU Charges</td><td class="text-end">${receiptHead.pu_charges}</td></tr>
        <tr><td>CDF & DILP</td><td class="text-end">${receiptHead.cdf_dilp}</td></tr>
    `;
    const amountInWords = SuperHelper.numberToWords(receipt.amount);
    let paymentRow = '';

    if (receipt.payment_mode === 'Cash') {
        paymentRow = `
        <tr>
            <td>CASH RECEIVED</td>
            <td class="text-end">${receipt.amount}</td>
        </tr>
    `;
    } else {
        paymentRow = `
        <tr>
            <td>${receipt.payment_mode.toUpperCase()} (${receipt.transaction_id})</td>
            <td class="text-end">${receipt.amount}</td>
        </tr>
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
                <span>Today's Receipt History</span>

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
