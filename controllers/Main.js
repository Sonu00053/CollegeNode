const path = require('path');
exports.website = (req, res) => {
    res.sendFile(
        path.join(process.cwd(), 'views', 'index.html')
    );
};