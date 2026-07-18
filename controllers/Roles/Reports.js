const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');

exports.ClassWiseSubjectReport = async (req, res) => {

    const result = await UserModel.getRecords('roll_no', {}, '*');

    const thead = `
        <tr>
            <th>#</th>
            <th>Class</th>
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

        tableRows += `
            <tr>
                <td>${index + 1}</td>
                    <td>${Class.course_name} - ${u.year}</td>  
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

    const { course_id,year } = req.params;

    const result = await UserModel.getRecords('students', {course:course_id,course_year:year}, '*');
    const thead = `
        <tr>
            <th>#</th>
            <th>Student Id</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Father Name</th>
            <th>Mother Name</th>
            <th>Course</th>
            <th>Subjects</th>
            <th>Joining Date & Time</th>
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
            <td>${u.roll_no}</td>
            <td>${u.first_name} ${u.last_name}</td>
             <td>${u.father_name}</td>
            <td>${u.mother_name}</td>
            <td>${course?.course_name  + ' - '+ u.course_year  || ''}</td>

            <td>
                <button
                    class="btn btn-primary btn-sm view-subjects"
                    data-subjects='${JSON.stringify(subjectList)}'>
                    View
                </button>
            </td>
            <td>${SuperHelper.formatDate(u.created_at)}</td>

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