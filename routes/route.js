const express = require('express');
const router = express.Router();
const Main = require('../controllers/Main');


// router.get('/', (req, res) => {
//     res.send('Main Route');
// });
router.get('/', Main.website);

module.exports = router;