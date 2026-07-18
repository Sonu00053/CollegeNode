const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// const bcrypt = require('bcryptjs');




exports.loginView = (req, res) => {
    const token = req.cookies.token;

    if (token) {
        return res.redirect(`${global.CONSTANTS.role}index`);
    }
    View.Rview(res, 'login');
};

exports.login = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await UserModel.getSingleRecord('staff', { email: email, password: password }, '*');
        if (!user) {
            return res.status(401).json({
                status: false,
                message: 'Invalid Credentials '
            });
        }
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                staff_id: user.staff_id,
                role: user.role,
                check: CONSTANTS.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 🔥 SET COOKIE (IMPORTANT)
        const COOKIE_MAX_AGE = Number(process.env.COOKIE_MAX_AGE) || 172800000;

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // production me true (HTTPS)
            sameSite: 'strict',
            maxAge: COOKIE_MAX_AGE // 1 day
        });

        return res.json({
            status: true,
            message: 'Login Successful',
            redirect: CONSTANTS.role + 'index'
        });

    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.changePassword = async (req, res) => {
    const errors = {};
    const email = req.user.email; // ya decoded.email
    let password = '', confirmpassword = '';
    let message = '', messageType = '';
    if (req.method === 'POST') {
        ({ confirmpassword = '', password = '' } = req.body);
        errors.password = !password ? 'Password required' : password.length < 6 ? 'Min 6 chars' : '';
        errors.confirmpassword = !confirmpassword ? 'Confirm Password required' : confirmpassword.length < 6 ? 'Min 6 chars' : '';
        Object.keys(errors).forEach(k => !errors[k] && delete errors[k])
        if (Object.keys(errors).length) {
            message = 'Fix validation errors';
            messageType = 'error';
        } else {
            if (confirmpassword == password) {
                await UserModel.updateRecord(
                    'staff',
                    {
                        password
                    },
                    {
                        email: email
                    }
                );
                message = 'User Password Update successfully!';
                messageType = 'success';
                password = '';
                confirmpassword = '';

            } else {
                message = 'Confirm Password Does Not Match';
                messageType = 'error';
            }
        }
    }
    const fields = `
            ${Form.label("Password")}
            ${Form.password("password", password, {
        class: `form-control ${errors.password ? "is-invalid" : ""}`,
        placeholder: "Enter Password"
    })}
            ${errors.password ? `<div class="text-danger small mt-1">${errors.password}</div>` : ""}

           ${Form.label("Confirm Password")}
            ${Form.password("confirmpassword", confirmpassword, {
        class: `form-control ${errors.confirmpassword ? "is-invalid" : ""}`,
        placeholder: "Enter Confirm Password"
    })}
            ${errors.confirmpassword ? `<div class="text-danger small mt-1">${errors.confirmpassword}</div>` : ""}`;
    const buttons = `
            ${Form.submit("Update", {
        class: "btn btn-dark"
    })}
 
        `;
    const response = {
        title: 'Change Password',
        action: CONSTANTS.role + 'change-password',
        method: 'POST',
        message,
        messageType,
        errors,
        fields: fields,
        buttons: buttons
    };

    return View.Rview(res, 'forms', response);
};

exports.registerView = async (req, res) => {
    try {
        const course = await UserModel.getRecords('courses', {}, '*');
        const subjects = await UserModel.getRecords('subjects', {}, '*');
        const states = await UserModel.getRecords('states', {}, '*');
        // console.log('States:', states); // Debugging line to check the states data
        return View.Rview(res, 'register', {
            course, states
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.admission = async (req, res) => {
    try {
        return View.Rview(res, 'admission');
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: 'Server Error'
        });
    }
};

exports.getSubjectsByCourse = async (req, res) => {
    try {
        const { course_id } = req.params;

        const subjects = await UserModel.getRecords(
            'subjects',
            { course_id },
            '*'
        );

        const course = await UserModel.getSingleRecord(
            'courses',
            { id: course_id },
            '*'
        );

        return res.json({
            status: true,
            subjects,
            duration: course.duration
        });

    } catch (err) {
        return res.json({
            status: false
        });
    }
};

// exports.getSubjectsByCourseGroup = async (req, res) => {
//     try {

//         const { course_id, year } = req.params;

//         const subjects = await UserModel.getRecords(
//             'subjects',
//             {
//                 course_id,
//                 year,
//                 status: 1
//             },
//             '*'
//         );

//         const course = await UserModel.getSingleRecord(
//             'courses',
//             { id: course_id },
//             '*'
//         );

//         // Group subjects by category
//         const groupedSubjects = subjects.reduce((acc, subject) => {

//             const category = subject.category || 'Uncategorized';

//             if (!acc[category]) {
//                 acc[category] = [];
//             }

//             acc[category].push(subject);

//             return acc;

//         }, {});

//         return res.json({
//             status: true,
//             subjects: groupedSubjects,
//             duration: course?.duration || 0
//         });

//     } catch (err) {

//         console.error(err);

//         return res.json({
//             status: false,
//             message: err.message
//         });
//     }
// };


exports.getSubjectsByCourseGroup = async (req, res) => {
    try {
        const { course_id } = req.params;

        const subjects = await UserModel.getRecords(
            'subjects',
            { course_id: course_id, year: 1 },
            '*'
        );

        const course = await UserModel.getSingleRecord(
            'courses',
            { id: course_id },
            '*'
        );

        // Group subjects by category
        const groupedSubjects = subjects.reduce((acc, subject) => {
            const category = subject.category || "Uncategorized";

            if (!acc[category]) {
                acc[category] = [];
            }

            acc[category].push(subject);

            return acc;
        }, {});
        // console.log(groupedSubjects);
        return res.json({
            status: true,
            subjects: groupedSubjects,
            duration: course.duration
        });

    } catch (err) {
        return res.json({
            status: false
        });
    }
};





exports.getSubjectsGroup = async (req, res) => {
    try {
        const { courseId, year } = req.params;
        // console.log(req.params);

        const subjects = await UserModel.getRecords(
            'subjects',
            { course_id: courseId, year: year },
            '*'
        );
        // console.log(subjects);

        const course = await UserModel.getSingleRecord(
            'courses',
            { id: courseId },
            '*'
        );

        // Group subjects by category
        const groupedSubjects = subjects.reduce((acc, subject) => {
            const category = subject.category || "Uncategorized";

            if (!acc[category]) {
                acc[category] = [];
            }

            acc[category].push(subject);

            return acc;
        }, {});
        // console.log(groupedSubjects);
        return res.json({
            status: true,
            subjects: groupedSubjects,
            duration: course.duration
        });

    } catch (err) {
        return res.json({
            status: false
        });
    }
};






exports.register = async (req, res) => {
    const staff_id = req.user.staff_id;
    console.log('Request Body:', req.body); // Debugging line to check the request body
    try {
        const {
            first_name,
            last_name,
            // roll_no,
            dob,
            father_name,
            father_mobile,
            mother_name,
            mobile,
            email,
            pincode,
            address,
            city,
            state,
            course,
            semester,
            transport,
            vehicle_name,
            vehicle_no,
            subject_ids,
            student_id,
            apaar_id,
            aadhar_no,
            category,
            security_allow
        } = req.body;

        // Required Validation

        // !last_name ||
        // !email ||
        if (
            !first_name ||

            !dob ||
            // !roll_no ||
            !father_name ||
            !father_mobile ||
            !mother_name ||
            !mobile ||
            // !pincode ||
            !address ||
            !city ||
            !state ||
            !course ||
            !semester ||
            // !aadhar_no ||
            // !apaar_id ||
            !category
        ) {
            return res.status(400).json({
                status: false,
                message: 'All required fields are mandatory'
            });
        }
        // if (transport === 'Yes') {

        //     if (!vehicle_name || !vehicle_no) {
        //         return res.status(400).json({
        //             status: false,
        //             message: 'Vehicle Name and Vehicle No are required'
        //         });
        //     }

        // }



        if (transport === 'Yes') {
            var parkingfees = 1000;

        } else {
            var parkingfees = 0;

        }








        // Email Validation

        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid email address'
                });
            }
            const existingUser = await UserModel.getSingleRecord(
                'students',
                { email },
                '*'
            );
            if (existingUser) {
                return res.status(400).json({
                    status: false,
                    message: 'Email already registered'
                });
            }
        }

        // Mobile Validation
        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).json({
                status: false,
                message: 'Student mobile must be 10 digits'
            });
        }

        if (!/^[0-9]{10}$/.test(father_mobile)) {
            return res.status(400).json({
                status: false,
                message: 'Father mobile must be 10 digits'
            });
        }

        const existingStudent = await UserModel.getSingleRecord(
            'students',
            { student_id },
            '*'
        );

        const addhaarExist = await UserModel.getSingleRecord(
            'students',
            { aadhar_no },
            '*'
        );

        const existingAparId = await UserModel.getSingleRecord(
            'students',
            { apaar_id },
            '*'
        );

        if (existingAparId) {
            return res.status(400).json({
                status: false,
                message: 'Apaar ID already exists'
            });
        }
        if (aadhar_no != '') {
            if (addhaarExist) {
                return res.status(400).json({
                    status: false,
                    message: 'Aadhaar No already exists'
                });
            }
        }
        if (existingStudent) {
            return res.status(400).json({
                status: false,
                message: 'Student ID already exists'
            });
        }


        const coursechek = await UserModel.getSingleRecord(
            'roll_no',
            { course_id: course, year: semester },
            '*'
        );
        console.log(coursechek);

        let totalPracticalFee = 0;
        let security = 0;

        let totalFees = (Number(coursechek.admission) + Number(coursechek.tution) + Number(coursechek.af_charges) + Number(coursechek.anual) + Number(coursechek.pu_charges) + Number(coursechek.cdf_dilp) + Number(coursechek.uni_examination) + Number(parkingfees));

        let subjectsArray = [];
        try {
            subjectsArray = subject_ids ? JSON.parse(subject_ids) : [];
        } catch (e) {
            subjectsArray = [];
        }
        if (Number(course) == 1) {
            if (subjectsArray.length == 0) {
                return res.status(400).json({
                    status: false,
                    message: 'Please Select Subjects'
                });
            }
        }

        const statedetail = await UserModel.getSingleRecord(
            'states',
            { id: state },
            '*'
        );
        const yearColumn = `${semester}y`;
        // const student_id = await exports.generateStaffId();
        const roll_no = await exports.rollNoGenerate(course, semester);

        var gender = 'female';

        if (security_allow === 'Yes') {
            totalFees = (totalFees + Number(coursechek.security));
            security = Number(coursechek.security);

        }

        const year = new Date().getFullYear();
        let subjects = '';
        let practical = 0;
        var fine_arts_status = 0;
        var music_vocal_status = 0;
        var music_instrumnet_status = 0;
        var computer_science_status = 0;
        var english_honour_status = 0;
        var home_science_status = 0;
        var physical = 0;
        var physical = 0;
        if (subjectsArray) {
            const ids = subjectsArray;
            let practicalAdded = false;

            for (const id of ids) {
                const subject = await UserModel.getSingleRecord(
                    'subjects',
                    { id },
                    'subject_name,practical_status,practical_key'
                );
                if (subject) {
                    subjects += subject.subject_name + ', ';
                    if (course == 1 && !practicalAdded) {
                        if (subject.subject_name == 'Foundation of Physical Education and Sports') {
                            const practicalfees = await UserModel.getSingleRecord(
                                'roll_no',
                                { course_id: course,year:semester },
                                'practical,practical'
                            );
                            totalFees = (totalFees + Number(practicalfees.practical));
                            totalPracticalFee = (totalPracticalFee + Number(practicalfees.practical));
                            practical = 1;
                            physical = Number(practicalfees.practical);
                            practicalAdded = true;
                        }
                    }




                    if (Number(subject.practical_status) == 1) {
                        const addedfees = await UserModel.getSingleRecord(
                            'roll_no',
                            { course_id: course,year:semester },
                            'fine_arts,music_vocal,music_instrumnet,computer_science,english_honour,home_science'
                        );

                        if (subject.practical_key == "practical") {
                            var fine_arts_status = Number(addedfees.fine_arts);
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
            subjects = subjects.replace(/, $/, '');
        }
        // console.log(totalFees);
        const insertData = {
            student_id,
            roll_no,
            first_name,
            last_name,
            category,
            dob,
            gender,
            aadhar_no,
            father_name,
            father_mobile,
            mother_name,
            mobile,
            email: email?.trim() || null,
            pincode,
            address,
            staff_id,
            city,
            state: statedetail.name,
            course,
            course_year: semester,
            total_fees: totalFees,
            practical_status: practical,
            transport,
            vehicle_name: transport === 'Yes' ? vehicle_name : '',
            vehicle_no: transport === 'Yes' ? vehicle_no : '',
            subject_ids: JSON.stringify(subjectsArray),
            fine_arts: fine_arts_status,
            music_vocal: music_vocal_status,
            music_instrumnet: music_instrumnet_status,
            computer_science: computer_science_status,
            english_honour: english_honour_status,
            home_science: home_science_status,
            total_practical_fees: totalPracticalFee,
            physical: physical,
            security: security,
            parking_fees: parkingfees

        };
        const insertDatasession = {
            student_id,
            roll_no,
            course: (coursechek.course_name),
            course_id: course,
            session_start: year,
            year: semester,
            session_end: (year + 1),
            subjects: subjects
        };
        const result = await UserModel.addRecord(
            'students',
            insertData
        );
        if (!result) {
            return res.status(400).json({
                status: false,
                message: "Student registration failed"
            });
        }
        const result2 = await UserModel.addRecord(
            'session_detail',
            insertDatasession
        );
        // return res.status(200).json({
        //     status: true,
        //     message: 'Student Registered Successfully',
        //     student_id
        // });
        return res.status(200).json({
            status: true,
            message: 'Student Registered Successfully',
            redirect: CONSTANTS.role + 'create-reciept?student_id=' + student_id
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: false,
            message: 'Internal Server Error'
        });
    }
};

exports.rollNoGenerate = async (course_id, year) => {

    while (true) {

        const roll = await UserModel.getSingleRecord(
            'roll_no',
            { course_id, year },
            '*'
        );

        if (!roll) {
            throw new Error('Roll number configuration not found.');
        }

        const currentYear = new Date().getFullYear();

        let runningNo;

        if (roll.last_year != currentYear) {
            // New Year
            runningNo = roll.start;
        } else {
            runningNo = roll.last_rno == null
                ? roll.start
                : Number(roll.last_rno) + 1;
        }

        const finalNo = `${currentYear}${runningNo}`;

        // Check if already exists in students table
        const exists = await UserModel.getSingleRecord(
            'students',
            { roll_no: finalNo },
            'id'
        );

        if (!exists) {

            // Update counter only after successful check
            await UserModel.updateRecord(
                'roll_no',
                {
                    last_rno: runningNo,
                    last_year: currentYear
                },
                { id: roll.id },

            );

            return finalNo;
        }

        await UserModel.updateRecord(
            'roll_no',
            {
                last_rno: runningNo,
                last_year: currentYear
            },
            { id: roll.id },

        );
    }
};