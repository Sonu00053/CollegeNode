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
            <th>Student Id</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Mobile No</th>
            <th>Father Mobile</th>
            <th>Category</th>
            <th>Date Of Birth</th>
            <th>Father Name</th>
            <th>Mother Name</th>
            <th>Address</th>
            <th>Course</th>
            <th>Subjects</th>
            <th>Total Fees</th>
            <th>Pending Fees</th>
            <th>Admission Date</th>
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
        const date = new Date(u.admission_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const newdate = `${year}-${month}-${day}`;
        const admdate = SuperHelper.OnlyDate(u.admission_date);
        const dob = SuperHelper.dob(u.dob);
        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${u.student_id}</td>
            <td>${u.roll_no}</td>
            <td>${u.first_name} ${u.last_name}</td>
            <td>${u.mobile}</td>
            <td>${u.father_mobile}</td>
            <td>${u.category}</td>
            <td>${dob}</td>
            <td>${u.father_name}</td>
            <td>${u.mother_name}</td>
            <td>${u.address}</td>
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
                { admission_date: newdate },
                'COUNT(*) total_records, IFNULL(SUM(amount),0) total_amount'
            );

            const cash = await UserModel.getSingleRecorddate(
                'receipt_details',
                {
                    admission_date: newdate,
                    payment_mode: 'Cash'
                },
                'IFNULL(SUM(amount),0) total'
            );

            const online = await UserModel.getSingleRecorddate(
                'receipt_details',
                {
                    admission_date: newdate,
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

exports.subjectAddressReport = async (req, res) => {

    return View.Rview(res, "subject_address_report", {
        title: "Address / Subject Wise Report"
    });

}

exports.getAddresses = async (req, res) => {

    const address = await UserModel.getGroupByField(
        "students",
        "address"
    );
    // console.log(address);

    return res.json({
        status: true,
        data: address
    });

}

exports.getSubjectsByClass = async (req, res) => {

    const { year } = req.body;

    const subjects = await UserModel.getRecords(
        "subjects",
        {
            course_id: 1,
            year: year
        },
        "id,subject_name,category"
    );

    return res.json({
        status: true,
        data: subjects
    });

}

exports.subjectAddressSearch = async (req, res) => {

    const { type, address, year, subject } = req.body;
    const course = 1;

    let students = [];

    if (type == "address") {

        students = await UserModel.getRecords(
            "students",
            {
                address: address
            },
            "*"
        );

    } else {

        const allStudents = await UserModel.getRecords(
            "students",
            {
                course: course,
                course_year: year
            },
            "*"
        );

        let selectedSubjects = req.body.subject || [];

        if (!Array.isArray(selectedSubjects)) {
            selectedSubjects = [selectedSubjects];
        }

        selectedSubjects = selectedSubjects.map(Number);

        students = [];

        for (const s of allStudents) {

            if (!s.subject_ids) continue;

            let ids = [];

            try {
                ids = JSON.parse(s.subject_ids).map(Number);
            } catch (e) {
                ids = [];
            }

            // ANY selected subject matches
            if (ids.some(id => selectedSubjects.includes(id))) {
                students.push(s);
            }
        }

    }

    let tableRows = "";

    for (const [i, u] of students.entries()) {

        let subjectList = [];

        if (u.subject_ids) {

            const ids = JSON.parse(u.subject_ids);

            for (const id of ids) {

                const sub = await UserModel.getSingleRecord(
                    "subjects",
                    { id },
                    "subject_name,category"
                );

                if (sub) {
                    subjectList.push(`${sub.subject_name} (${sub.category})`);
                }

            }

        }
        const course = await UserModel.getSingleRecord(
            'courses',
            { id: u.course },
            '*'
        );

        tableRows += `
        <tr>
            <td>${i + 1}</td>
            <td>${u.roll_no}</td>
            <td>${u.student_id}</td>
            <td>${u.first_name} ${u.last_name}</td>
            <td>${u.mobile}</td>
            <td>${course?.course_name + ' - ' + u.course_year || ''}</td>
            <td>${u.address}</td>
            <td>
                <ol>
                    ${subjectList.map(x => `<li>${x}</li>`).join("")}
                </ol>
            </td>
        </tr>
        `;
    }

    return res.json({
        status: true,
        tableRows
    });

}

exports.subjectReport = async (req, res) => {

    return View.Rview(res, "subject", {
        title: "Subject Wise Report"
    });

}

exports.subjectSearch = async (req, res) => {

    const { type, year, subject } = req.body;
    const course = 1;
    let students = [];
    const allStudents = await UserModel.getRecords(
        "students",
        {
            course: course,
            course_year: year
        },
        "*"
    );
    let selectedSubjects = req.body.subject || [];
    if (!Array.isArray(selectedSubjects)) {
        selectedSubjects = [selectedSubjects];
    }
    selectedSubjects = selectedSubjects.map(Number);
    console.log("Selected Subjects:", selectedSubjects);

    students = [];

    for (const s of allStudents) {

        if (!s.subject_ids) continue;

        let ids = [];

        try {
            ids = JSON.parse(s.subject_ids).map(Number);
        } catch (e) {
            ids = [];
        }

        // Selected kiye gaye SABHI subjects student ke paas hone chahiye
        const hasAllSubjects = selectedSubjects.every(id =>
            ids.includes(id)
        );

        if (hasAllSubjects) {
            students.push(s);
        }
    }


    let tableRows = "";

    for (const [i, u] of students.entries()) {

        let subjectList = [];

        if (u.subject_ids) {

            let ids = [];

            try {
                ids = JSON.parse(u.subject_ids).map(Number);
            } catch (e) {
                ids = [];
            }
            // Sirf wahi subjects show honge jo search me select kiye gaye hain
            const matchedSubjectIds = ids.filter(id =>
                selectedSubjects.includes(id)
            );

            for (const id of matchedSubjectIds) {

                const sub = await UserModel.getSingleRecord(
                    "subjects",
                    { id },
                    "subject_name, category"
                );

                if (sub) {
                    subjectList.push(
                        `${sub.subject_name} (${sub.category})`
                    );
                }
            }
        }
        const course = await UserModel.getSingleRecord(
            'courses',
            { id: u.course },
            '*'
        );

        tableRows += `
        <tr>
            <td>${i + 1}</td>
            <td>${u.roll_no}</td>
            <td>${u.student_id}</td>
            <td>${u.first_name} ${u.last_name}</td>
            <td>${u.mobile}</td>
            <td>${course?.course_name + ' - ' + u.course_year || ''}</td>
            <td>${u.address}</td>
            <td>
                <ol>
                    ${subjectList.map(x => `<li>${x}</li>`).join("")}
                </ol>
            </td>
        </tr>
        `;
    }

    return res.json({
        status: true,
        tableRows
    });
}


exports.classhangerequest = async (req, res) => {
        const staff_id = req.user.staff_id;
    const result = await UserModel.getRecords('class_update_detail', {staff_id:staff_id}, '*', 'id desc');
    const thead = `
        <tr>
            <th>#</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Old Class</th>
            <th>New Class</th>
            <th>Old Subject</th>
            <th>New Subject</th>
            <th>Old Total Fees</th>
            <th>New Total Fees</th>
            <th>Status</th>
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
        const Newcourse = await UserModel.getSingleRecord(
            'courses',
            { id: u.new_course },
            '*'
        );
        const StudentDetail = await UserModel.getSingleRecord(
            'students',
            { student_id: u.student_id },
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

        let subjectListNew = [];

        if (u.new_subject_ids) {

            const ids = JSON.parse(u.new_subject_ids);

            for (const id of ids) {

                const subject = await UserModel.getSingleRecord(
                    'subjects',
                    { id },
                    'subject_name,category'
                );

                if (subject) {
                    subjectListNew.push(`${subject.subject_name} (${subject.category})`);
                }

            }

        }
        // <td>${new Date(u.admission_date).toISOString().split('T')[0]}</td>


        // const headsView = '<a href="' + '/admin/heads-detail/' + u.student_id + '" class="btn btn-sm btn-dark">View</a>';
        // const date = new Date(u.admission_date);
        // const year = date.getFullYear();
        // const month = String(date.getMonth() + 1).padStart(2, '0');
        // const day = String(date.getDate()).padStart(2, '0');
        // const newdate = `${year}-${month}-${day}`;
        const newdate = SuperHelper.OnlyDate(u.created_at);

        let status = '';
        if (Number(u.status) == 0) {



            status = `
        <span class="badge bg-warning text-dark">
            <i class="bi bi-clock-fill"></i> Pending
        </span>
    `;

        } else if (Number(u.status) == 1) {
            status = `
        <span class="badge bg-success">
            <i class="bi bi-check-circle-fill"></i> Success
        </span>
    `;

        } else if (Number(u.status) == 2) {


            status = `
        <span class="badge bg-danger">
            <i class="bi bi-x-circle-fill"></i> Rejected
        </span>
    `;
        }
        tableRows += `
        
        <tr>
            <td>${index + 1}</td>
            <td>${u.student_id}</td>
            <td>${StudentDetail.first_name} ${StudentDetail.last_name}</td>
            <td>${course.course_name}-${u.course_year}</td>
            <td>${Newcourse.course_name}-${u.new_course_year}</td>
        <td>
         
        ${subjectList.length > 0 ? `
            <div class="card border shadow-sm" style="width: 180px;">
                <div class="card-body p-2 subject-card-body">
                    ${subjectList.map(subject => `
                        <div class="small border-bottom py-1">
                            ${subject}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
          
        </td>
        <td>
        ${subjectListNew.length > 0 ? `
            <div class="card border shadow-sm" style="width: 180px;">
                <div class="card-body p-2 subject-card-body">
                    ${subjectListNew.map(subject => `
                        <div class="small border-bottom py-1">
                            ${subject}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
           
        </td>
        <td>${CONSTANTS.currency}${u.total_fees}</td>
        <td>${CONSTANTS.currency}${u.new_total_fees}</td>
        <td>${status}</td>
        <td>${newdate}</td>

        </tr>
        `;
    }

    return View.Rview(res, 'reports', {

        title: `Class Change Report
        
        `,

        thead,
        tableRows

    });

};

exports.subjectchangerequest = async (req, res) => {
    const staff_id = req.user.staff_id;



    const result = await UserModel.getRecords('subject_update_detail', {staff_id:staff_id}, '*', 'id desc');
    const thead = `
        <tr>
            <th>#</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Class</th>
            <th>Old Subject</th>
            <th>New Subject</th>
            <th>Old Total Fees</th>
            <th>New Total Fees</th>
            <th>Date</th>
            <th>Status</th>
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
         const StudentDetail = await UserModel.getSingleRecord(
            'students',
            { student_id: u.student_id },
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

        let subjectListNew = [];

        if (u.new_subject_ids) {

            const ids = JSON.parse(u.new_subject_ids);

            for (const id of ids) {

                const subject = await UserModel.getSingleRecord(
                    'subjects',
                    { id },
                    'subject_name,category'
                );

                if (subject) {
                    subjectListNew.push(`${subject.subject_name} (${subject.category})`);
                }

            }

        }
     
        const newdate = SuperHelper.OnlyDate(u.created_at);

        let status = '';
      
        if (Number(u.status) == 0) {

           

            status = `
        <span class="badge bg-warning text-dark">
            <i class="bi bi-clock-fill"></i> Pending
        </span>
    `;

        } else if (Number(u.status) == 1) {

        

            status = `
        <span class="badge bg-success">
            <i class="bi bi-check-circle-fill"></i> Success
        </span>
    `;

        } else if (Number(u.status) == 2) {


            status = `
        <span class="badge bg-danger">
            <i class="bi bi-x-circle-fill"></i> Rejected
        </span>
    `;
        }
        tableRows += `
        
        <tr>
            <td>${index + 1}</td>
            <td>${u.student_id}</td>
            <td>${StudentDetail.first_name} ${StudentDetail.last_name}</td>
            <td>${course.course_name}-${u.course_year}</td>
        <td>
        <div class="card border shadow-sm" style="width: 180px;">
            <div class="card-body p-2 subject-card-body">

                ${subjectList.map(subject => `
                    <div class="small border-bottom py-1">
                        ${subject}
                    </div>
                `).join('')}

            </div>
        </div>
        </td>
          <td>
        <div class="card border shadow-sm" style="width: 180px;">
            <div class="card-body p-2 subject-card-body">

                ${subjectListNew.map(subject => `
                    <div class="small border-bottom py-1">
                        ${subject}
                    </div>
                `).join('')}

            </div>
        </div>
        </td>
        <td>${CONSTANTS.currency}${u.total_fees}</td>
        <td>${CONSTANTS.currency}${u.new_total_fees}</td>
        <td>${newdate}</td>
        <td>${status}</td>

        </tr>
        `;
    }

    return View.Rview(res, 'reports', {

        title: `Subject Change Report
        
        `,

        thead,
        tableRows

    });

};