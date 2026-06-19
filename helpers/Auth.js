const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {

        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/admin/logout');
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (decoded.role !== 'A') {
            const backUrl = req.get('Referer');
            return res.status(403).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Access Denied</title>

                    <style>
                        *{
                            margin:0;
                            padding:0;
                            box-sizing:border-box;
                            font-family:Arial,sans-serif;
                        }

                        body{
                            min-height:100vh;
                            display:flex;
                            justify-content:center;
                            align-items:center;
                            background:#f4f6f9;
                            padding:20px;
                        }

                        .card{
                            background:#fff;
                            width:100%;
                            max-width:500px;
                            padding:40px;
                            border-radius:12px;
                            box-shadow:0 10px 30px rgba(0,0,0,.1);
                            text-align:center;
                        }

                        .icon{
                            font-size:70px;
                            margin-bottom:15px;
                        }

                        h1{
                            color:#dc3545;
                            margin-bottom:15px;
                        }

                        p{
                            color:#666;
                            margin-bottom:25px;
                            line-height:1.6;
                        }

                        .btn{
                            display:inline-block;
                            padding:12px 25px;
                            background:#007bff;
                            color:#fff;
                            text-decoration:none;
                            border-radius:6px;
                            transition:.3s;
                        }

                        .btn:hover{
                            background:#0056b3;
                        }
                    </style>
                </head>

                <body>

                    <div class="card">

                        <div class="icon">🚫</div>

                        <h1>Access Denied</h1>

                        <p>
                            You do not have permission to access this page.
                        </p>

                        <a class="btn" href="${backUrl}">
                            ⬅ Go Back
                        </a>

                    </div>

                </body>
                </html>
            `);
        }

        req.user = decoded;

        next();

    } catch (err) {

        console.log(err);

        return res.redirect('/admin/logout');
    }
};