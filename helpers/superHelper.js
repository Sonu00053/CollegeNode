const XLSX = require('xlsx');

class SuperHelper {

    // ======================
    // DATE FORMAT
    // ======================
    static formatDate(date) {

        if (!date) return '';

        const d = new Date(date);

        const pad = (n) => String(n).padStart(2, '0');

        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
            `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // ======================
    // DYNAMIC EXCEL EXPORT
    // ======================
    static exportUsers(res, data, thead) {

        if (!Array.isArray(data)) data = [];

        // 🔥 auto keys
        const keys = data.length ? Object.keys(data[0]) : [];

        const excelData = data.map((row, index) => {

            const obj = {};

            keys.forEach(key => {

                let value = row[key];

                // 🔥 auto date format
                if (
                    key.toLowerCase().includes('date') ||
                    key.toLowerCase().includes('created_at')
                ) {
                    value = this.formatDate(value);
                }

                obj[key.toUpperCase()] = value ?? '';
            });

            // 🔥 SERIAL ID (override DB id)
            obj.ID = index + 1;

            return obj;
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

        const buffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx'
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            'attachment; filename=export.xlsx'
        );

        return res.end(buffer);
    }

    static notFoundPage() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Page Not Found</title>

            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

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
                background:linear-gradient(135deg,#4f46e5,#3b82f6);
                font-family:Arial,Helvetica,sans-serif;
            }
            .error-card{
                width:90%;
                max-width:700px;
                background:#fff;
                border-radius:20px;
                padding:50px;
                text-align:center;
                box-shadow:0 20px 50px rgba(0,0,0,.2);
            }
            .error-code{
                font-size:120px;
                font-weight:800;
                color:#0d6efd;
                line-height:1;
            }
            .error-title{
                font-size:34px;
                font-weight:700;
                margin-top:15px;
            }
            .error-text{
                color:#6c757d;
                margin:20px auto 35px;
                max-width:500px;
            }
            .error-img{
                width:180px;
                margin-bottom:20px;
            }
            .btn-custom{
                min-width:170px;
                padding:12px 25px;
                border-radius:40px;
                font-weight:600;
            }
            .footer-text{
                margin-top:30px;
                color:#999;
                font-size:14px;
            }
            @media(max-width:576px){
            .error-card{
                padding:30px;
            }
            .error-code{
                font-size:80px;
            }
            .error-title{
                font-size:28px;
            }
            }
            </style>

            </head>
            <body>

            <div class="error-card">

                <img src="https://cdn-icons-png.flaticon.com/512/2748/2748558.png"
                    class="error-img"
                    alt="404">

                <div class="error-code">404</div>

                <h2 class="error-title">
                    Oops! Page Not Found
                </h2>

                <p class="error-text">
                    The page you're looking for doesn't exist, has been moved, or the URL is incorrect.
                </p>

                <div class="d-flex justify-content-center gap-3 flex-wrap">

                    <a href="/" class="btn btn-primary btn-custom">
                        🏠 Home
                    </a>

                    <button onclick="history.back()" class="btn btn-outline-secondary btn-custom">
                        ← Go Back
                    </button>

                </div>

                <div class="footer-text">
                    Error Code : 404
                </div>

            </div>

            </body>
            </html>
                    `;
    }

    static send404(res) {
        return res.status(404).send(this.notFoundPage());
    }

}

module.exports = SuperHelper;