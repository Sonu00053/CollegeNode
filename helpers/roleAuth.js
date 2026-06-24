const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

exports.verifyToken = async (req, res, next) => {
    try {

        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/role/logout');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await UserModel.getSingleRecord(
            'staff',
            { email: decoded.email },
            '*'
        );

        if (!user) {
            return res.redirect('/role/logout');
        }

        let permissions = user.access || [];

        if (typeof permissions === 'string') {
            permissions = permissions.trim();

            try {
                permissions = JSON.parse(permissions);
            } catch (err) {

                console.log("JSON parse failed, using fallback...");

                permissions = permissions
                    .replace(/[\[\]"']/g, '')
                    .split(',')
                    .map(x => x.trim())
                    .filter(Boolean);
            }
        }

        if (!Array.isArray(permissions)) {
            permissions = [];
        }

        const currentPath = req.originalUrl.split('?')[0];

        // Exact + Dynamic route support
        const hasAccess = permissions.some(permission => {

            // Exact URL match
            if (currentPath === permission) {
                return true;
            }

            // Dynamic route support
            // Example:
            // Permission => /role/reciept
            // URL        => /role/reciept/1
            if (currentPath.startsWith(permission + '/')) {
                return true;
            }

            return false;
        });

        if (!hasAccess) {

            const backUrl = req.get('Referer') || '';

            return res.status(403).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 - Access Denied</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" rel="stylesheet">

    <style>
        *{
            margin:0;
            padding:0;
            box-sizing:border-box;
        }

        body{
            min-height:100vh;
            display:flex;
            justify-content:center;
            align-items:center;
            background: linear-gradient(135deg,#667eea,#764ba2);
            font-family:'Segoe UI',sans-serif;
        }

        .card-box{
            width:100%;
            max-width:500px;
            padding:50px 40px;
            text-align:center;
            color:#fff;
            border-radius:25px;
            background:rgba(255,255,255,.12);
            backdrop-filter:blur(15px);
            border:1px solid rgba(255,255,255,.2);
            box-shadow:0 10px 30px rgba(0,0,0,.2);
        }

        .icon{
            width:110px;
            height:110px;
            margin:auto;
            border-radius:50%;
            background:#fff;
            color:#dc3545;
            display:flex;
            justify-content:center;
            align-items:center;
            font-size:50px;
        }

        .error-code{
            font-size:90px;
            font-weight:700;
            margin-top:20px;
        }

        .btn-custom{
            padding:12px 28px;
            border-radius:50px;
            font-weight:600;
        }
    </style>
</head>
<body>

<div class="card-box">

    <div class="icon">
        <i class="fa-solid fa-lock"></i>
    </div>

    <div class="error-code">403</div>

    <h2 class="mt-3">Access Denied</h2>

    <p class="mt-3 mb-4">
        Sorry! You don't have permission to access this page.
    </p>

    <div class="d-flex justify-content-center gap-3">

        <button class="btn btn-light btn-custom" onclick="goBack()">
            <i class="fa-solid fa-arrow-left"></i>
            Go Back
        </button>

        <a href="/" class="btn btn-danger btn-custom">
            <i class="fa-solid fa-house"></i>
            Home
        </a>

    </div>

</div>

<script>

function goBack() {

    const backUrl = "${backUrl}";

    if (backUrl && backUrl !== "undefined") {
        window.location.href = backUrl;
    }
    else if (document.referrer) {
        window.location.href = document.referrer;
    }
    else {
        history.back();
    }

}

</script>

</body>
</html>
`);
        }

        req.user = decoded;

        res.locals.user = user;
        res.locals.permissions = permissions;
        res.locals.permissionsJSON = JSON.stringify(permissions);

        next();

    } catch (err) {

        console.log(err);

        return res.redirect('/role/logout');

    }
};