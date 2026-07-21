const express = require('express');
const router = express.Router();
const Login = require('../controllers/Admin/Login');
const Manage = require('../controllers/Admin/Manage');
const Permission = require('../controllers/Admin/Permission');
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

router.get('/all-staff', jwtAuth.verifyToken, Manage.StaffHistory);
router.get('/admission-reciept-request', jwtAuth.verifyToken, Manage.admissionrecieptrequest);

router.post('/admission-receipt-request-action', jwtAuth.verifyToken,Manage.admissionReceiptRequestAction);



router.route('/add')
    .get(jwtAuth.verifyToken,Manage.add)
    .post(jwtAuth.verifyToken,Manage.add);

    router.route('/subAdmin')
    .get(jwtAuth.verifyToken,Permission.addSubadmin)
    .post(jwtAuth.verifyToken,Permission.addSubadmin);

module.exports = router;