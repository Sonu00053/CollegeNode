const express = require('express');
const router = express.Router();
const Login = require('../controllers/SuperAdmin/Login');
const Manage = require('../controllers/SuperAdmin/Manage');
const Permission = require('../controllers/SuperAdmin/Permission');
const jwtAuth = require('../helpers/superAuth');


router.get('/super', (req, res) => {
    res.send('Super Route');
});

router.get('/login', Login.loginView);
// router.get('/index2', Manage.index);
router.post('/loginPost', Login.login);

// router.get('/register', Login.registerView);
// router.post('/registerPost', Login.register);
router.get('/logout', Manage.logout);
router.get('/index', jwtAuth.verifyToken, Manage.dashboard);
router.get('/report', jwtAuth.verifyToken, Manage.users);
router.post('/report', jwtAuth.verifyToken, Manage.users);
router.get('/all-staff', jwtAuth.verifyToken, Manage.StaffHistory);
router.route('/add')
    .get(jwtAuth.verifyToken,Manage.add)
    .post(jwtAuth.verifyToken,Manage.add);

// router.get('/dashboardData', jwtAuth.verifyToken, Manage.dashboardData);
module.exports = router;