const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const crypto = require("crypto");





exports.updateamdrecipt = async (req, res) => {
    try {
        const staff_id = req.user.staff_id;
        const recieptid = req.body.id;
        const type = req.body.type;
        let amount = req.body.amount || "";
        let remarks = req.body.remarks || "";
        const errors = {};
        if (!amount) {
            errors.amount = "Amount field required";
        } else if (!/^\d+$/.test(amount)) {
            errors.amount = "Only digits allowed";
        }
        if (Object.keys(errors).length > 0) {
            return res.json({
                status: false,
                message: "Fix validation errors",
                errors
            });
        }
        let Table = "";
        if (type === "admission") {
            Table = "receipt_details";
        } else if (type === "balance") {
            Table = "balance_receipt_details";
        } else {
            Table = "";
        }
        if (!Table) {
            return res.json({
                status: false,
                message: "Something went wrong."
            });
        }
        const receipt = await UserModel.getSingleRecord(
            Table,
            { id: recieptid },
            "*"
        );
        if (!receipt) {
            return res.json({
                status: false,
                message: "Receipt not found."
            });
        }
        const student = await UserModel.getSingleRecord(
            "students",
            { student_id: receipt.student_id },
            "*"
        );
        if (!student) {
            return res.json({
                status: false,
                message: "Student not found."
            });
        }
        const newTable = "receipt_details_update";
        const Updaterecord = await UserModel.getSingleRecord(
            newTable,
            {
                table_id: recieptid,
                status: 0
            },
            "*"
        );
        const oldAmount = Number(receipt.amount);
        const newAmount = Number(amount);
        let difference = 0;
        let newAvailableFees = 0;
        let newPendingFees = 0;
        const recieptAwailable = Number(receipt.available_fees);
        if (Updaterecord && Number(Updaterecord.status) === 0) {
            return res.json({
                status: false,
                message: "This Receipt Already Pending Please Wait..."
            });
        }
        if (newAmount <= 0) {
            return res.json({
                status: false,
                message: "Minimum Amount Is " + CONSTANTS.currency + "1"
            });
        }
        if (newAmount === oldAmount) {
            return res.json({
                status: false,
                message: "Please Set New Amount"
            });
        }
        if (oldAmount > newAmount) {
            difference = oldAmount - newAmount;
            newPendingFees = Number(student.pending_fees) - difference;
            newAvailableFees = Number(student.available_fees) + difference;
        } else {
            difference = newAmount - oldAmount;
            newPendingFees = Number(student.pending_fees) + difference;
            newAvailableFees = Number(student.available_fees) - difference;
        }
        if (newPendingFees > Number(student.total_fees)) {
            return res.json({
                status: false,
                message: "Amount cannot exceed remaining fees."
            });
        }
        if (newPendingFees < 0) {
            return res.json({
                status: false,
                message: "Invalid amount."
            });
        }
        await UserModel.addRecord(newTable, {
            student_id: receipt.student_id,
            table_id: receipt.id,
            receipt_no: receipt.receipt_no,
            amount: oldAmount,
            type: type,
            new_amount: newAmount,
            reciept_table: Table,
            remarks: remarks,
            total_fees: receipt.total_fees,
            available_fees: recieptAwailable,
            payment_mode: receipt.payment_mode,
            transaction_id: receipt.transaction_id,
            course_id: receipt.course_id,
            year: receipt.year,
            staff_id: receipt.staff_id,
            request_id: staff_id,
            student_available: newAvailableFees,
            student_pending: newPendingFees,
            created_at: new Date()

        });
        return res.json({
            status: true,
            message: "Receipt Update Request Submitted Successfully."
        });
    } catch (err) {
        console.log(err);
        return res.json({
            status: false,
            message: "Something went wrong."
        });
    }
};


exports.updatestidentProfile = async (req, res) => {

    const student_id = req.params.student_id;
    const staff_id = req.user.staff_id;


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

    const redirectUrl = CONSTANTS.role + "update-profile/" + student_id;

    // Fetch Student
    let student = await UserModel.getSingleRecord(
        "students",
        { student_id },
        "*"
    );

    if (!student) {
        return View.Rview(res, "404", {
            message: "Student not found."
        });
    }

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
        studentFeesUrl: CONSTANTS.role + "student-fees",
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

    return View.Rview(res, "forms", response);
};


exports.updateClassandsubjects = async (req, res) => {
    try {
        const student_id = req.params.student_id;
        const staff_id = req.user.staff_id;
        const course = await UserModel.getRecords('courses', {}, '*');
        const subjects = await UserModel.getRecords('subjects', {}, '*');
        const studentDetail = await UserModel.getSingleRecord('students', { student_id: student_id }, '*');
        const coursename = await UserModel.getSingleRecord(
            'courses',
            { id: studentDetail.course },
            '*'
        );
        const pendingFees = (Number(studentDetail.total_fees) - Number(studentDetail.pending_fees));
        if (req.method === 'POST') {
            const {
                subject_ids,
            } = req.body;
            let subjectsArray = [];
            try {
                subjectsArray = subject_ids ? JSON.parse(subject_ids) : [];
            } catch (e) {
                subjectsArray = [];
            }
            let subjects = '';
            let practical = 0;
            var fine_arts_status = 0;
            var music_vocal_status = 0;
            var music_instrumnet_status = 0;
            var computer_science_status = 0;
            var english_honour_status = 0;
            var home_science_status = 0;
            var physical = 0;
            let totalPracticalFee = 0;
            let totalFees = 0;


            if (Number(studentDetail.course) == 1) {
                const coursechek = await UserModel.getSingleRecord(
                    'roll_no',
                    { course_id: Number(studentDetail.course), year: Number(studentDetail.course_year) },
                    '*'
                );
                let parkingfees = Number(studentDetail.parking_fees);
                let security = Number(studentDetail.security);
                totalFees = (Number(coursechek.admission) + Number(coursechek.tution) + Number(coursechek.af_charges) + Number(coursechek.anual) + Number(coursechek.pu_charges) + Number(coursechek.cdf_dilp) + Number(coursechek.uni_examination) + Number(parkingfees) + security);

                let existingSubjects = [];
                try {
                    existingSubjects = studentDetail.subject_ids
                        ? JSON.parse(studentDetail.subject_ids)
                        : [];
                } catch (e) {
                    existingSubjects = [];
                }
                const oldIds = existingSubjects.map(String).sort();
                const newIds = subjectsArray.map(String).sort();
                if (newIds.length === 0) {
                    return res.status(400).json({
                        status: false,
                        message: 'Please Select Subjects'
                    });
                }
                const isSame =
                    oldIds.length === newIds.length &&
                    oldIds.every((id, index) => id === newIds[index]);

                if (isSame) {
                    return res.status(400).json({
                        status: false,
                        message: 'Existing subjects and new subjects are the same. Please change at least one subject.'
                    });
                }
                if (subjectsArray) {
                    const ids = subjectsArray;

                    for (const id of ids) {
                        const subject = await UserModel.getSingleRecord(
                            'subjects',
                            { id },
                            'subject_name,practical_status,practical_key'
                        );
                        if (subject) {
                            subjects += subject.subject_name + ', ';
                            if (Number(subject.practical_status) == 1) {
                                const addedfees = await UserModel.getSingleRecord(
                                    'roll_no',
                                    { course_id: Number(studentDetail.course), year: Number(studentDetail.course_year) },
                                    'fine_arts,music_vocal,music_instrumnet,computer_science,english_honour,home_science,practical'
                                );

                                if (subject.practical_key == "practical") {
                                    var physical = Number(addedfees.practical);
                                    practical = 1;
                                    totalFees = (totalFees + Number(addedfees.fine_arts));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.fine_arts));
                                }


                                if (subject.practical_key == "fine_arts") {
                                    var fine_arts_status = Number(addedfees.fine_arts);
                                    totalFees = (totalFees + Number(addedfees.fine_arts));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.fine_arts));
                                }

                                if (subject.practical_key == "music_vocal") {
                                    var music_vocal_status = Number(addedfees.music_vocal);
                                    totalFees = (totalFees + Number(addedfees.music_vocal));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.music_vocal));

                                }
                                if (subject.practical_key == "music_instrumnet") {
                                    var music_instrumnet_status = Number(addedfees.music_instrumnet);
                                    totalFees = (totalFees + Number(addedfees.music_instrumnet));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.music_instrumnet));

                                }
                                if (subject.practical_key == "computer_science") {
                                    var computer_science_status = Number(addedfees.computer_science);
                                    totalFees = (totalFees + Number(addedfees.computer_science));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.computer_science));

                                }
                                if (subject.practical_key == "english_honour") {
                                    var english_honour_status = Number(addedfees.english_honour);
                                    totalFees = (totalFees + Number(addedfees.english_honour));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.english_honour));

                                }
                                if (subject.practical_key == "home_science") {
                                    var home_science_status = Number(addedfees.home_science);
                                    totalFees = (totalFees + Number(addedfees.home_science));
                                    totalPracticalFee = (totalPracticalFee + Number(addedfees.home_science));

                                }
                            }
                        }
                    }
                }
            }
            const request_id = await exports.generateRequestId();

            await UserModel.addRecord('subject_update_detail', {
                student_id,
                request_id,
                course: studentDetail.course,
                course_year: studentDetail.course_year,
                total_fees: studentDetail.total_fees,
                subject_ids: studentDetail.subject_ids,
                new_subject_ids: JSON.stringify(subjectsArray),
                fine_arts: fine_arts_status,
                music_vocal: music_vocal_status,
                music_instrumnet: music_instrumnet_status,
                computer_science: computer_science_status,
                english_honour: english_honour_status,
                home_science: home_science_status,
                total_practical_fees: totalPracticalFee,
                physical: physical,
                practical_status: practical,
                staff_id,
                new_total_fees: totalFees

            });
            return res.json({
                status: true,
                message: "Student Subject Update Request Submit Successfully!"
            });
        }
        html = '';

        if (studentDetail.subject_ids) {

            const ids = JSON.parse(studentDetail.subject_ids);

            html += `
        <table class="table table-bordered table-hover">
            <thead class="table-success">
                <tr>
                    <th width="60">#</th>
                    <th>Subject Name</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
    `;

            let i = 1;

            for (const id of ids) {

                const subject = await UserModel.getSingleRecord(
                    'subjects',
                    { id },
                    '*'
                );

                if (!subject) continue;

                html += `
            <tr>
                <td>${i++}</td>
                <td>${subject.subject_name}</td>
                <td>${subject.category || '-'}</td>
            </tr>
        `;
            }

            html += `
            </tbody>
        </table>
    `;
        }

        return View.Rview(res, 'changesubjects', {
            header: 'User Profile',
            action: "update-subjects/" + student_id,
            redirect: CONSTANTS.role + "update-subjects/" + student_id,
            course,
            subjectuser: studentDetail.subject_ids,
            studentDetail,
            html,
            pendingFees,
            coursename: coursename.course_name + '-' + studentDetail.course_year,

        });
    } catch (err) {
        console.log(err);

        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.generateRequestId = async () => {
    while (true) {
        const requestId = crypto.randomInt(1000000000, 10000000000).toString();
        const exists = await UserModel.getSingleRecord(
            "subject_update_detail",
            { request_id: requestId },
            "id"
        );

        if (!exists) {
            return requestId;
        }
    }
};