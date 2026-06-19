require('dotenv').config();

global.CONSTANTS = require('./constants/constant');

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

// ============================
// BODY PARSERS
// ============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================
// COOKIE PARSER
// ============================
app.use(cookieParser());

// ============================
// STATIC FILES
// ============================
app.use(express.static(path.join(__dirname, 'views')));

// ============================
// ROUTES
// ============================
const adminRoutes = require('./routes/admin');
const superRoutes = require('./routes/super');
const mainroute = require('./routes/route');
const userroute = require('./routes/user');
app.use('/admin', adminRoutes);
app.use('/super', superRoutes);
app.use('/user', userroute);
app.use('/', mainroute);

// ============================
// 404 HANDLER
// ============================
app.use((req, res) => {
    res.status(404).send('404 - Page Not Found');
});

module.exports = app;