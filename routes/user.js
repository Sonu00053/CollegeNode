const express = require('express');
const router = express.Router();
const Auth = require('../controllers/User/Auth');
const Manage = require('../controllers/User/Manage');
const jwtAuth = require('../helpers/UserAuth');


router.get('/', (req, res) => {
    res.send('User Route');
});

router.get('/register', Auth.registerView);
router.post('/registerPost', Auth.register);

router.get('/login', Auth.login);
router.post('/loginpost', Auth.loginPost);

router.get('/logout', Manage.logout);




router.get('/index',jwtAuth.verifyStudent, Manage.dashboard);
router.get('/Idcard',jwtAuth.verifyStudent, Manage.idcard);


module.exports = router;