const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');

exports.ClassWiseSubjectReport = async (req, res) => {

    const result = await UserModel.getRecords('roll_no', {}, '*');

    const thead = `
        <tr>
            <th>#</th>
            <th>Class</th>
            <th>Total Students</th>
            <th>Action</th>
        </tr>
    `;

    const rows = Array.isArray(result) ? result : (result?.rows || []);

    let tableRows = '';

    for (const [index, u] of rows.entries()) {
        const Class = await UserModel.getSingleRecorddate(
            'courses',
            {
                id: u.course_id
            },
            'course_name'
        );

        const totalStudents = await UserModel.getSingleRecord(
            'students',
            { course: u.course_id, course_year: u.year },
            'COUNT(id) as total'
        );

        tableRows += `
            <tr>
                <td>${index + 1}</td>
                    <td>${Class.course_name} - ${u.year}</td>  
                    <td>${totalStudents.total}</td>  
                     <td>
                    <a href="${CONSTANTS.role}per-class-subject-history/${u.course_id}/${u.year}"
                       class="btn btn-sm btn-primary">
                       View 
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



    return View.Rview(res, 'reports', {
        title: `
            <div class="d-flex justify-content-between align-items-center">
                <span>Admission Summary Classwise</span>
            </div>
        `,
        thead,
        tableRows,
    });

};


exports.perclasssubject = async (req, res) => {

    const { course_id, year } = req.params;

    const result = await UserModel.getRecords('students', { course: course_id, course_year: year }, '*');
    const thead = `
        <tr>
            <th>#</th>
            <th>Roll No</th>
            <th>ADMN.Date</th>
            <th>Student Name</th>
            <th>Mobile No</th>
            <th>Subject Name</th>
        </tr>
    `;

    const Class = await UserModel.getSingleRecorddate(
        'courses',
        {
            id: course_id
        },
        'course_name'
    );

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
                    'subject_name,category'
                );

                if (subject) {
                    subjectList.push(`${subject.subject_name} (${subject.category})`);
                }

            }

        }
        // <td>${new Date(u.admission_date).toISOString().split('T')[0]}</td>


        const headsView = '<a href="' + CONSTANTS.role + 'heads-detail/' + u.student_id + '" class="btn btn-sm btn-dark">View</a>';
        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${u.roll_no}</td>
            <td>${new Date(u.created_at).toLocaleDateString('en-CA')}</td>
            <td>${u.first_name} ${u.last_name}</td>
            <td>${u.mobile} <br> ${u.father_mobile}</td>
        <td>
    <ol style="margin:0; padding-left:18px;">
        ${subjectList.map(subject => `<li>${subject}</li>`).join('')}
    </ol>
</td>
        </tr>
        `;
    }

    return View.Rview(res, 'reports', {

        title: `
        <div class="d-flex justify-content-between">
            <span>Class ${Class.course_name} - ${year} Subject Report</span>
        </div>
        `,

        thead,
        tableRows

    });

};



exports.updateFees = async (req, res) => {
    try {
        // Reset Available Fees = Total Fees
        const students = await UserModel.getRecords('students', {}, '*');

        for (const student of students) {
            await UserModel.updateRecord(
                'students',
                {
                    available_fees: Number(student.total_fees)
                },
                {
                    student_id: student.student_id
                }
            );
        }

        // Update receipt_details
        await updateReceiptTable('receipt_details');

        // Update balance_receipt_details
        await updateReceiptTable('balance_receipt_details');

        return res.json({
            status: true,
            message: 'Fees Updated Successfully'
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};


async function updateReceiptTable(tableName) {

    const receipts = await UserModel.getRecords(
        tableName,
        {},
        '*'
    );

    for (const receipt of receipts) {

        const student = await UserModel.getSingleRecord(
            'students',
            {
                student_id: receipt.student_id
            },
            'available_fees,total_fees'
        );

        const availableFees = Number(student.available_fees);
        const totalFees = Number(student.total_fees);
        const amount = Number(receipt.amount);

        // Receipt Table Update
        await UserModel.updateRecord(
            tableName,
            {
                available_fees: availableFees,
                total_fees: totalFees
            },
            {
                id: receipt.id
            }
        );

        // Student Remaining Fees Update
        await UserModel.updateRecord(
            'students',
            {
                available_fees: availableFees - amount
            },
            {
                student_id: receipt.student_id
            }
        );
    }
}





exports.reciptBetweenHistory = async (req, res) => {

    const from_date = req.query.from_date || '';
    const to_date = req.query.to_date || '';

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

    let totalCash = 0;
    let totalOnline = 0;
    let grandTotal = 0;

    if (from_date && to_date) {

        let index = 1;

        for (
            let currentDate = new Date(from_date);
            currentDate <= new Date(to_date);
            currentDate.setDate(currentDate.getDate() + 1)
        ) {

            const newdate = currentDate.toISOString().split('T')[0];

            // Receipt Table
            const receipt = await UserModel.getSingleRecorddate(
                'receipt_details',
                { created_at: newdate },
                'COUNT(*) total_records, IFNULL(SUM(amount),0) total_amount'
            );

            const cash = await UserModel.getSingleRecorddate(
                'receipt_details',
                {
                    created_at: newdate,
                    payment_mode: 'Cash'
                },
                'IFNULL(SUM(amount),0) total'
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
                'IFNULL(SUM(amount),0) total'
            );

            // Balance Receipt Table
            const balance = await UserModel.getSingleRecorddate(
                'balance_receipt_details',
                { created_at: newdate },
                'COUNT(*) total_records, IFNULL(SUM(amount),0) total_amount'
            );

            const balanceCash = await UserModel.getSingleRecorddate(
                'balance_receipt_details',
                {
                    created_at: newdate,
                    payment_mode: 'Cash'
                },
                'IFNULL(SUM(amount),0) total'
            );

            const balanceOnline = await UserModel.getSingleRecorddate(
                'balance_receipt_details',
                {
                    created_at: newdate,
                    payment_mode: {
                        operator: '!=',
                        value: 'Cash'
                    }
                },
                'IFNULL(SUM(amount),0) total'
            );

            const cashTotal =
                Number(cash.total) +
                Number(balanceCash.total);

            const onlineTotal =
                Number(online.total) +
                Number(balanceOnline.total);

            const amountTotal =
                Number(receipt.total_amount) +
                Number(balance.total_amount);

            totalCash += cashTotal;
            totalOnline += onlineTotal;
            grandTotal += amountTotal;

            tableRows += `
                <tr>
                    <td>${index++}</td>
                    <td>${newdate}</td>
                    <td>${Number(receipt.total_records) + Number(balance.total_records)}</td>
                    <td>${CONSTANTS.currency}${amountTotal}</td>
                    <td>${CONSTANTS.currency}${cashTotal}</td>
                    <td>${CONSTANTS.currency}${onlineTotal}</td>
                </tr>
            `;
        }
    }

    return View.Rview(res, 'datereport', {

        title: 'Receipt History Between Dates',

        from_date,
        to_date,
        url: CONSTANTS.role + "receipt-between-history/",

        totalCash,
        totalOnline,
        grandTotal,

        thead,
        tableRows

    });

};