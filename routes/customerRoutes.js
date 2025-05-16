const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const db = require('../database');

router.get('/', (req, res) => {
    res.render('layout', {
        title: 'Joan CRM',
        content: 'index'
    });
});

router.get('/customers', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM customer ORDER BY cusid ASC');
    const total = await db.query('SELECT COUNT(*) FROM customer');
    res.render('layout', {
        title: 'Customer List',
        content: 'list',
        customers: rows,
        total: total.rows[0].count,
        search: {},
        message: null
    });

});
router.get('/customers/new', (req, res) => {
    res.render('layout', {
        title: 'Add Customer',
        content: 'new',
        data: {},
        error: null,
        success: false
    });
});
router.post('/customers/new', customerController.createCustomer);
router.get('/customers/:id/edit', customerController.editCustomerForm);
router.post('/customers/:id/edit', customerController.updateCustomer);
router.get('/customers/:id/delete', customerController.deleteCustomerForm);
router.post('/customers/:id/delete', customerController.deleteCustomer);
router.get('/import', customerController.importForm);
router.post('/import', customerController.importCustomers);
router.get('/export', customerController.exportCustomers);
router.post('/customers/search', customerController.searchCustomers);

module.exports = router;