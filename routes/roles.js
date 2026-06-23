const express = require('express');
const router = express.Router();
const Login = require('../controllers/Roles/Login');
const Manage = require('../controllers/Roles/Manage');
const Permission = require('../controllers/Roles/Permission');
const jwtAuth = require('../helpers/roleAuth');


router.get('/roles', (req, res) => {
    res.send('Roles Route');
});

router.get('/login', Login.loginView);
router.post('/loginPost', Login.login);
router.route('/change-password')
    .get(jwtAuth.verifyToken,Login.changePassword)
    .post(jwtAuth.verifyToken,Login.changePassword);

router.get('/register',jwtAuth.verifyToken, Login.registerView);
router.post('/registerPost',jwtAuth.verifyToken, Login.register);
router.get('/logout', Manage.logout);
router.get('/index', jwtAuth.verifyToken, Manage.dashboard);
router.get('/all-students', jwtAuth.verifyToken, Manage.users);
router.get('/subjects/:course_id', Login.getSubjectsByCourse);

router.route('/create-reciept')
    .get(jwtAuth.verifyToken,Manage.reciptcreate)
    .post(jwtAuth.verifyToken,Manage.reciptcreate);

module.exports = router;