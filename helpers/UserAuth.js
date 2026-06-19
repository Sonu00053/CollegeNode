const jwt = require('jsonwebtoken');

exports.verifyStudent = (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/user/login');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ STUDENT CHECK
        if (!decoded.student_id) {
            return res.redirect('/user/login');
        }

        req.user = decoded;
        next();

    } catch (err) {
        console.log(err);
        return res.redirect('/user/login');
    }
};