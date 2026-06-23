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
    thead = `
            <tr>
                <th>#</th>
                <th>Email</th>
                <th>Course</th>
                <th>Subjects</th>
                <th>Total Fees</th>
                <th>Pending Fees</th>
                <th>Date</th>
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
        let subjects = '';

        if (u.subject_ids) {

            const ids = JSON.parse(u.subject_ids);

            for (const id of ids) {

                const subject = await UserModel.getSingleRecord(
                    'subjects',
                    { id },
                    'subject_name'
                );

                if (subject) {
                    subjects += subject.subject_name + ', ';
                }
            }
            

            subjects = subjects.replace(/, $/, '');
        }

        tableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${u.email}</td>
                <td>${course?.course_name || ''}</td>
                <td>${subjects || ''}</td>
                <td>${u.total_fees}</td>
                <td>${u.total_fees - u.pending_fees}</td>
                <td>${SuperHelper.formatDate(u.created_at)}</td>
            </tr>
            `;
    }
    if (!rows.length) {
        tableRows = `
        <tr>
            <td colspan="5">No Data Found</td>
        </tr>
    `;
    }
    return View.Rview(res, 'reports', {
        title: 'All Students Report',
        thead: thead,
        tableRows,
    });

};


exports.reciptcreate = async (req, res) => {
    const errors = {};
    let roll_no = '', amount = '', payment_mode = '', payment_details = '';
    let message = '', messageType = '';

    if (req.method === 'POST') {
        ({ roll_no = '', amount = '', payment_mode = '', payment_details = '' } = req.body);
        errors.roll_no = !roll_no
            ? 'Roll No field required'
            : '';

        errors.amount = !amount
            ? 'Amount field required'
            : !/^\d+$/.test(amount)
                ? 'Only digits allowed'
                : '';

        errors.payment_mode = !payment_mode
            ? 'Payment Mode field required'
            : '';

        if (payment_mode !== 'Cash' && !payment_details) {
            errors.payment_details = 'This field is required';
        }

        Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);

        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {

            await UserModel.addRecord('receipt_details', {
                roll_no,
                amount,
                payment_mode,
                payment_details
            });

            message = 'Receipt created successfully!';
            messageType = 'success';

            roll_no = '';
            amount = '';
            payment_mode = '';
            payment_details = '';
        }
    }

    const fields = `
        ${Form.label("Roll No")}
        ${Form.text("roll_no", roll_no, {
            class: `form-control ${errors.roll_no ? "is-invalid" : ""}`,
            placeholder: "Enter Roll No"
        })}
        ${errors.roll_no ? `<div class="text-danger small mt-1">${errors.roll_no}</div>` : ""}

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

        <div id="payment_details_div" style="display:none;" class="mt-3">
            <label id="payment_details_label"></label>
            <input type="text"
                   name="payment_details"
                   id="payment_details"
                   value="${payment_details}"
                   class="form-control ${errors.payment_details ? "is-invalid" : ""}">
            ${errors.payment_details ? `<div class="text-danger small mt-1">${errors.payment_details}</div>` : ""}
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
        action: '/role/create-reciept',
        method: 'POST',
        message,
        messageType,
        errors,
        fields,
        buttons
    };

    return View.Rview(res, 'forms', response);
};

exports.generaterecieptId = async () => {
    const lastReceipt = await UserModel.getSingleRecord(
        'receipt_details',
        {},
        'receipt_no',
        'id DESC'
    );

    if (!lastReceipt || !lastReceipt.receipt_no) {
        return 'REC000001';
    }

    const lastNumber = parseInt(lastReceipt.receipt_no.replace('REC', ''), 10);
    const nextNumber = lastNumber + 1;

    return `REC${String(nextNumber).padStart(6, '0')}`;
};



exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true
    });

    return res.redirect('/role/login');
};
