require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

const customerRoutes = require('./routes/customerRoutes');
const fileUpload = require('express-fileupload');
app.use(fileUpload());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use('/', customerRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});