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
}

module.exports = SuperHelper;