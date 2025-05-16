const db = require('../database');
const fs = require('fs');
const path = require('path');

exports.showCustomerList = async (req, res) => {
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
};


exports.newCustomerForm = (req, res) => res.render('new', { title: 'Add Customer', error: null, data: {}, success: false });

exports.createCustomer = async (req, res) => {
    const { id, firstname, lastname, state, salesytd, salesprev } = req.body;

    if (!id || !firstname || !lastname) {
        return res.render('layout', {
            title: 'Add Customer',
            content: 'new',
            error: 'ID, First Name and Last Name required',
            data: req.body,
            success: false
        });
    }

    try {
        await db.query(
            'INSERT INTO customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, firstname, lastname, state, salesytd, salesprev]
        );

        return res.render('layout', {
            title: 'Add Customer',
            content: 'new',
            error: null,
            data: {},
            success: true
        });
    } catch (err) {
        console.error('Insert failed:', err);
        return res.render('layout', {
            title: 'Add Customer',
            content: 'new',
            error: 'Insert failed — maybe duplicate ID?',
            data: req.body,
            success: false
        });
    }
};


exports.editCustomerForm = async (req, res) => {
    const customerId = req.params.id;

    try {
        const { rows } = await db.query('SELECT * FROM customer WHERE cusid = $1', [customerId]);

        if (rows.length === 0) {
            return res.redirect('/customers');
        }

        res.render('layout', {
            title: `Edit Customer #${customerId}`,
            content: 'edit',
            customer: rows[0],
            error: null,
            success: false
        });
    } catch (err) {
        console.error('Error loading customer:', err);
        res.redirect('/customers');
    }
};
exports.updateCustomer = async (req, res) => {
    const customerId = req.params.id;
    const { firstname, lastname, state, salesytd, salesprev } = req.body;

    if (!firstname || !lastname) {
        return res.render('layout', {
            title: `Edit Customer #${customerId}`,
            content: 'edit',
            customer: {
                cusid: customerId,
                cusfname: firstname,
                cuslname: lastname,
                cusstate: state,
                cussalesytd: salesytd,
                cussalesprev: salesprev
            },
            error: 'First Name and Last Name are required.',
            success: false
        });
    }

    try {
        await db.query(
            `UPDATE customer SET cusfname = $1, cuslname = $2, cusstate = $3, cussalesytd = $4, cussalesprev = $5 WHERE cusid = $6`,
            [firstname, lastname, state, salesytd, salesprev, customerId]
        );

        res.render('layout', {
            title: `Edit Customer #${customerId}`,
            content: 'edit',
            customer: {
                cusid: customerId,
                cusfname: firstname,
                cuslname: lastname,
                cusstate: state,
                cussalesytd: salesytd,
                cussalesprev: salesprev
            },
            error: null,
            success: true
        });
    } catch (err) {
        console.error('Update error:', err);
        res.render('layout', {
            title: `Edit Customer #${customerId}`,
            content: 'edit',
            customer: {
                cusid: customerId,
                cusfname: firstname,
                cuslname: lastname,
                cusstate: state,
                cussalesytd: salesytd,
                cussalesprev: salesprev
            },
            error: 'Update failed. Please try again.',
            success: false
        });
    }
};
exports.deleteCustomerForm = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customer WHERE cusid=$1', [req.params.id]);

        if (result.rows.length === 0) {
            return res.redirect('/customers');
        }

        res.render('layout', {
            title: 'Delete Customer',
            content: 'delete',
            customer: result.rows[0]
        });
    } catch (err) {
        console.error('Error loading customer for deletion:', err);
        res.redirect('/customers');
    }
};


exports.deleteCustomer = async (req, res) => {
    try {
        await db.query('DELETE FROM customer WHERE cusid=$1', [req.params.id]);
        res.redirect('/customers');
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.redirect('/customers');
    }
};


exports.importForm = (req, res) => {
    res.render('layout', {
        title: 'Import Customers',
        content: 'import_export',
        result: null
    });
};

exports.importCustomers = async (req, res) => {
    const file = req.files?.importFile;

    if (!file) {
        return res.render('layout', {
            title: 'Import Customers',
            content: 'import_export',
            result: '❌ No file selected.'
        });
    }

    const data = file.data.toString();
    const lines = data.split('\n');
    let total = 0, inserted = 0, errors = [];

    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        total++;

        const fields = cleanLine.split(',').map(f => f.trim());
        const [idRaw, firstname, lastname, state, ytdRaw, prevRaw] = fields;

        const id = Number(idRaw);
        const ytd = Number(ytdRaw);
        const prev = Number(prevRaw);

        if (!id || !firstname || !lastname || !state || isNaN(ytd) || isNaN(prev)) {
            errors.push({ line, reason: 'Invalid or missing fields' });
            continue;
        }

        try {
            await db.query(
                `INSERT INTO customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (cusid) DO NOTHING`, // Optional: remove if you want strict errors
                [id, firstname, lastname, state, ytd, prev]
            );
            inserted++;
        } catch (e) {
            errors.push({ line, reason: e.message });
        }
    }

    const errorLines = errors.length
        ? '<ul>' + errors.map(e => `<li><code>${e.line}</code> — ${e.reason}</li>`).join('') + '</ul>'
        : '';

    res.render('layout', {
        title: 'Import Customers',
        content: 'import_export',
        result: `Processed: ${total}, Inserted: ${inserted}, Errors: ${errors.length}${errorLines}`
    });
};

exports.exportCustomers = async (req, res) => {
    const { rows } = await db.query('SELECT * FROM customer');
    const lines = rows.map(r => `${r.cusid},${r.cusfname},${r.cuslname},${r.cusstate},${r.cussalesytd},${r.cussalesprev}`);
    const exportPath = path.join(__dirname, '../export.txt');
    fs.writeFileSync(exportPath, lines.join('\n'));
    res.download(exportPath, 'export.txt');
};

exports.searchCustomers = async (req, res) => {
    const { id, firstname, lastname, state, salesytd, salesprev } = req.body;

    let query = 'SELECT * FROM customer WHERE 1=1';
    const values = [];
    let i = 1;

    if (id) {
        query += ` AND cusid = $${i++}`;
        values.push(id);
    }
    if (firstname) {
        query += ` AND LOWER(cusfname) LIKE LOWER($${i++})`;
        values.push(`%${firstname}%`);
    }
    if (lastname) {
        query += ` AND LOWER(cuslname) LIKE LOWER($${i++})`;
        values.push(`%${lastname}%`);
    }
    if (state) {
        query += ` AND LOWER(cusstate) = LOWER($${i++})`;
        values.push(state);
    }
    if (salesytd) {
        query += ` AND cussalesytd >= $${i++}`;
        values.push(salesytd);
    }
    if (salesprev) {
        query += ` AND cussalesprev >= $${i++}`;
        values.push(salesprev);
    }

    const { rows } = await db.query(query, values);
    const total = await db.query('SELECT COUNT(*) FROM customer');

    res.render('layout', {
        title: 'Customer List',
        content: 'list',
        customers: rows,
        total: total.rows[0].count,
        search: req.body,
        message: rows.length === 0 ? 'No records found.' : null
    });
};
