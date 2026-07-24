const express = require('express');
const router = express.Router();
const Login = require('../controllers/Roles/Login');
const Manage = require('../controllers/Roles/Manage');
const Permission = require('../controllers/Roles/Permission');
const Course = require('../controllers/Roles/Course');
const Reports = require('../controllers/Roles/Reports');
const Settings = require('../controllers/Roles/Settings');
const jwtAuth = require('../helpers/roleAuth');


router.get('/roles', (req, res) => {
    res.send('Roles Route');
});

router.get('/login', Login.loginView);
router.post('/loginPost', Login.login);
router.route('/change-password')
    .get(jwtAuth.verifyToken, Login.changePassword)
    .post(jwtAuth.verifyToken, Login.changePassword);

router.get('/register', jwtAuth.verifyToken, Login.registerView);
router.post('/registerPost', jwtAuth.verifyToken, Login.register);
router.get('/logout', Manage.logout);
router.get('/index', jwtAuth.verifyToken, Manage.dashboard);
router.get('/all-students', jwtAuth.verifyToken, Manage.users);
router.get('/subjects/:course_id', Login.getSubjectsByCourse);
router.get('/subjects-group/:course_id', Login.getSubjectsByCourseGroup);
router.get('/subjects-group-course/:courseId/:year', Login.getSubjectsGroup);


router.get('/recieps-detail', jwtAuth.verifyToken, Manage.recieptHistory);
router.get('/reciept/:id', jwtAuth.verifyToken, Manage.reciept);






router.route('/create-reciept')
    .get(jwtAuth.verifyToken, Manage.reciptcreate)
    .post(jwtAuth.verifyToken, Manage.reciptcreate);

router.route('/balance-create-reciept')
    .get(jwtAuth.verifyToken, Manage.balancereciptcreate)
    .post(jwtAuth.verifyToken, Manage.balancereciptcreate);

    router.get('/balance-reciept/:id', jwtAuth.verifyToken,Manage.balancereciept);


router.route('/fees-update')
    .get(jwtAuth.verifyToken, Course.coursefessupdate)
    .post(jwtAuth.verifyToken, Course.coursefessupdate);
// router.get('/recieps-detail',jwtAuth.verifyToken, Manage.recieptHistory);
router.get('/course-fees-history', jwtAuth.verifyToken, Course.coursefeeshistory);
router.get('/heads-detail/:student_id', jwtAuth.verifyToken, Course.headsHistory);
router.get('/adm', jwtAuth.verifyToken, Login.admission);
router.post('/getSubjectNames', Manage.getSubjectNames);

router.get('/today-reciepts', jwtAuth.verifyToken, Manage.recieptHistoryToday);
router.get('/date-wise-reciept-history', jwtAuth.verifyToken,Manage.groupbyrecipthistory);
router.get('/date-wise-both-reciept-history', jwtAuth.verifyToken,Manage.reciptBothhistory);
router.get('/view-reciept-history/:date', jwtAuth.verifyToken,Manage.recieptHistorydatewisw);

router.get('/date-wise-balance-reciept-history', jwtAuth.verifyToken,Manage.balacegroupbyrecipthistory);
router.get('/balance-view-reciept-history/:date', jwtAuth.verifyToken,Manage.balancerecieptHistorydatewisw);

router.route('/update-reciept-heads')
    .get(Course.recieptheadupdate)
    .post(Course.recieptheadupdate);
router.post('/student-fees', jwtAuth.verifyToken, Manage.studentFees);

router.get('/profile/:student_id', jwtAuth.verifyToken,Manage.profile);


//  ===========================      Reports.    ===================================

router.get('/class-wise-history', jwtAuth.verifyToken,Reports.ClassWiseSubjectReport);

router.get('/per-class-subject-history/:course_id/:year', jwtAuth.verifyToken,Reports.perclasssubject);

// router
//     .route("/update-adm-reciept/:id")
//     .get(jwtAuth.verifyToken,Settings.updateamdrecipt)
//     .post(jwtAuth.verifyToken,Settings.updateamdrecipt);
    router.post('/update-adm-reciept',jwtAuth.verifyToken, Settings.updateamdrecipt);

router.get('/runSet',Reports.updateFees);
router.get('/receipt-between-history',jwtAuth.verifyToken,Reports.reciptBetweenHistory);



module.exports = router;