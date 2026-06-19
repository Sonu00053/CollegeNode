const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.redirect('/super/logout');
        }
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        console.log(decoded);
        if (decoded.role == 'A') {
    const backUrl = req.get('Referer') || '/';

    return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Access Denied</title>
        </head>
        <body>
            <h1>Access Denied</h1>
            <p>You do not have permission to access this page.</p>
            <a href="${backUrl}">Go Back</a>
        </body>
        </html>
    `);
}

        req.user = decoded;

        next();

    } catch (err) {

        console.log(err);

        return res.redirect('/super/logout');
    }
};