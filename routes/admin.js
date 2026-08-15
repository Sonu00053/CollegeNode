const express = require('express');
const router = express.Router();
const Login = require('../controllers/Admin/Login');
const Manage = require('../controllers/Admin/Manage');
const Permission = require('../controllers/Admin/Permission');
const Reports = require('../controllers/Admin/Reports');
const jwtAuth = require('../helpers/Auth');


router.get('/admin', (req, res) => {
    res.send('Admin Route');
});

router.get('/login', Login.loginView);
router.post('/loginPost', Login.login);

router.get('/register', jwtAuth.verifyToken,Login.registerView);
router.post('/registerPost',jwtAuth.verifyToken, Login.register);
router.get('/logout', Manage.logout);
router.get('/index', jwtAuth.verifyToken, Manage.dashboard);
router.get('/report', jwtAuth.verifyToken, Manage.users);
router.post('/report', jwtAuth.verifyToken, Manage.users);
router.post('/student-status',jwtAuth.verifyToken, Manage.updateStudentStatus);
router.get('/profile/:student_id', jwtAuth.verifyToken,Manage.profile);


router.get('/all-staff', jwtAuth.verifyToken, Manage.StaffHistory);
router.get('/admission-reciept-request', jwtAuth.verifyToken, Manage.admissionrecieptrequest);

router.post('/admission-receipt-request-action', jwtAuth.verifyToken,Manage.admissionReceiptRequestAction);
router.post('/approve-subjects', jwtAuth.verifyToken,Reports.approvesubjects);
router.post('/approve-change-class', jwtAuth.verifyToken,Reports.approvechangeclass);


router.get('/receipt-between-history',jwtAuth.verifyToken,Reports.reciptBetweenHistory);

router.get('/class-wise-history', jwtAuth.verifyToken,Reports.ClassWiseSubjectReport);
router.get('/subject-change-request-history', jwtAuth.verifyToken,Reports.subjectchangerequest);
router.get('/class-change-request-history', jwtAuth.verifyToken,Reports.classhangerequest);

router.get('/per-class-subject-history/:course_id/:year', jwtAuth.verifyToken,Reports.perclasssubject);

router.get("/subject-address-report", jwtAuth.verifyToken, Reports.subjectAddressReport);

router.post("/get-addresses", jwtAuth.verifyToken,Reports.getAddresses);

router.post("/get-subjects-report", jwtAuth.verifyToken,Reports.getSubjectsByClass);

router.post("/subject-address-search",jwtAuth.verifyToken, Reports.subjectAddressSearch);




router.route('/add')
    .get(jwtAuth.verifyToken,Manage.add)
    .post(jwtAuth.verifyToken,Manage.add);

    router.route('/subAdmin')
    .get(jwtAuth.verifyToken,Permission.addSubadmin)
    .post(jwtAuth.verifyToken,Permission.addSubadmin);

    router
    .route("/update-profile/:student_id")
    .get(jwtAuth.verifyToken,Manage.updatestidentProfile)
    .post(jwtAuth.verifyToken,Manage.updatestidentProfile);

module.exports = router;