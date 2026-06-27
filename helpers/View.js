const fs = require('fs');
const path = require('path');

exports.Aview = (res, fileName, data = {}) => {

    const fs = require('fs');
    const path = require('path');

    let body = fs.readFileSync(
        path.join(process.cwd(), 'views/Admin', `${fileName}.html`),
        'utf8'
    );

    const noLayoutPages = ['login'];

    if (!noLayoutPages.includes(fileName)) {

        const header = fs.readFileSync(
            path.join(process.cwd(), 'views/Admin/layouts/aheader.html'),
            'utf8'
        );

        const footer = fs.readFileSync(
            path.join(process.cwd(), 'views/Admin/layouts/afooter.html'),
            'utf8'
        );

        body = header + body + footer;
    }

    let html = body;

    // =========================
    // 1. SAFE NESTED + FLAT SUPPORT
    // =========================
    const replaceVars = (obj, prefix = '') => {

        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {

            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                replaceVars(value, fullKey);
            } else {
                html = html.replaceAll(`{{${fullKey}}}`, value ?? '');
            }
        });
    };

    replaceVars(data);

    // =========================
    // 2. ARRAY SUPPORT (JSON SAFE)
    // =========================
    Object.keys(data).forEach(key => {

        const value = data[key];

        if (Array.isArray(value)) {
            html = html.replaceAll(
                `{{${key}}}`,
                JSON.stringify(value)
            );
        }

    });

    // =========================
    // 3. CONSTANTS SUPPORT
    // =========================
    const CONSTANTS = global.CONSTANTS || {};

    Object.keys(CONSTANTS).forEach(key => {
        html = html.replaceAll(
            `{{CONSTANTS.${key}}}`,
            CONSTANTS[key]
        );
    });

    return res.send(html);
};

exports.Sview = (res, fileName, data = {}) => {

    const fs = require('fs');
    const path = require('path');

    let body = fs.readFileSync(
        path.join(process.cwd(), 'views/Super', `${fileName}.html`),
        'utf8'
    );

    const noLayoutPages = ['login'];

    if (!noLayoutPages.includes(fileName)) {

        const header = fs.readFileSync(
            path.join(process.cwd(), 'views/Super/layouts/aheader.html'),
            'utf8'
        );

        const footer = fs.readFileSync(
            path.join(process.cwd(), 'views/Super/layouts/afooter.html'),
            'utf8'
        );

        body = header + body + footer;
    }

    let html = body;

    // =========================
    // 1. SAFE NESTED + FLAT SUPPORT
    // =========================
    const replaceVars = (obj, prefix = '') => {

        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {

            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                replaceVars(value, fullKey);
            } else {
                html = html.replaceAll(`{{${fullKey}}}`, value ?? '');
            }
        });
    };

    replaceVars(data);

    // =========================
    // 2. ARRAY SUPPORT (JSON SAFE)
    // =========================
    Object.keys(data).forEach(key => {

        const value = data[key];

        if (Array.isArray(value)) {
            html = html.replaceAll(
                `{{${key}}}`,
                JSON.stringify(value)
            );
        }

    });

    // =========================
    // 3. CONSTANTS SUPPORT
    // =========================
    const CONSTANTS = global.CONSTANTS || {};

    Object.keys(CONSTANTS).forEach(key => {
        html = html.replaceAll(
            `{{CONSTANTS.${key}}}`,
            CONSTANTS[key]
        );
    });

    return res.send(html);
};

exports.Rview = (res, fileName, data = {}) => {

    const fs = require('fs');
    const path = require('path');

    let body = fs.readFileSync(
        path.join(process.cwd(), 'views/Roles', `${fileName}.html`),
        'utf8'
    );

    const noLayoutPages = ['login'];

    if (!noLayoutPages.includes(fileName)) {

        const header = fs.readFileSync(
            path.join(process.cwd(), 'views/Roles/layouts/aheader.html'),
            'utf8'
        );

        const footer = fs.readFileSync(
            path.join(process.cwd(), 'views/Roles/layouts/afooter.html'),
            'utf8'
        );

        body = header + body + footer;
    }

    let html = body;

    if (res.locals.permissions) {
        data.permissionsJSON = JSON.stringify(res.locals.permissions);
    }

    // =========================
    // Replace Variables
    // =========================
    const replaceVars = (obj, prefix = '') => {

        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {

            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (Array.isArray(value)) return;

            if (value && typeof value === 'object') {
                replaceVars(value, fullKey);
            } else {

                html = html.replaceAll(
                    `{{${fullKey}}}`,
                    value ?? ''
                );

            }

        });

    };

    replaceVars(data);

    // =========================
    // permissionsJSON replace
    // =========================
    if (data.permissionsJSON) {
        html = html.replaceAll(
            '{{permissionsJSON}}',
            data.permissionsJSON
        );
    }

    // =========================
    // Other arrays
    // =========================
    Object.keys(data).forEach(key => {

        if (Array.isArray(data[key])) {

            html = html.replaceAll(
                `{{${key}}}`,
                JSON.stringify(data[key])
            );

        }

    });

    // =========================
    // CONSTANTS
    // =========================
    const CONSTANTS = global.CONSTANTS || {};

    Object.keys(CONSTANTS).forEach(key => {

        html = html.replaceAll(
            `{{CONSTANTS.${key}}}`,
            CONSTANTS[key]
        );

    });

    return res.send(html);

};