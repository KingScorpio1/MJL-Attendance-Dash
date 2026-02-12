// File: backend/routes/payroll.js

const express = require('express');
const pool = require('../utils/database');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const PDFDocument = require('pdfkit'); 
const router = express.Router();

// Generate a payroll report for a specific teacher and date range
router.get('/generate', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
    try {
        const { teacherId, fromDate, toDate } = req.query;
        if (!teacherId || !fromDate || !toDate) {
            return res.status(400).json({ error: 'Teacher ID, From Date, and To Date are required.' });
        }

        // --- 1. Fetch Class Data ---
        const reportResult = await pool.query(
            `SELECT 
                c.name AS class_name,
                a.attendance_date,
                u.hourly_rate,
                EXTRACT(EPOCH FROM (c.end_time - c.start_time)) / 3600 AS class_duration_hours
             FROM attendance a
             JOIN classes c ON a.class_id = c.id
             JOIN users u ON c.teacher_id = u.id
             WHERE c.teacher_id = $1 AND a.attendance_date >= $2 AND a.attendance_date <= $3
             GROUP BY c.id, a.attendance_date, u.hourly_rate 
             ORDER BY a.attendance_date;`,
            [teacherId, fromDate, toDate]
        );

        // --- 2. Fetch Expense Data ---
        const expensesResult = await pool.query(
            `SELECT * FROM expenses 
             WHERE teacher_id = $1 AND status = 'approved' AND payroll_run_date IS NULL
             AND submitted_at >= $2 AND submitted_at <= $3`,
            [teacherId, fromDate, toDate]
        );
        const approvedExpenses = expensesResult.rows;
        
        // --- 3. Calculate Totals ---
        const classesWithPay = reportResult.rows.map(row => ({
            ...row,
            session_pay: (parseFloat(row.hourly_rate) * parseFloat(row.class_duration_hours)).toFixed(2)
        }));
        
        const classSalary = classesWithPay.reduce((sum, row) => sum + parseFloat(row.session_pay), 0);
        const totalExpenses = approvedExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const totalSalary = classSalary + totalExpenses;

        // --- 4. Send Response ---
        res.json({
            classes: classesWithPay,
            expenses: approvedExpenses,
            totalSalary: totalSalary.toFixed(2)
        });

    } catch (err) {
        console.error("Error generating payroll report:", err);
        res.status(500).json({ error: 'Server error generating payroll report.' });
    }
});

// Eport Payslip
router.get('/payslip', requireAuth, requireRole(['admin', 'accountant']), async (req, res) => {
    try {
        const { teacherId, fromDate, toDate } = req.query;
        if (!teacherId || !fromDate || !toDate) {
            return res.status(400).json({ error: 'Teacher ID and date range are required.' });
        }

        // 1. Fetch the same data as the generate route, plus the teacher's name
        const reportResult = await pool.query(
            `SELECT 
                c.name AS class_name, a.attendance_date, u.username AS teacher_name, u.hourly_rate,
                EXTRACT(EPOCH FROM (c.end_time - c.start_time)) / 3600 AS class_duration_hours
             FROM attendance a
             JOIN classes c ON a.class_id = c.id
             JOIN users u ON c.teacher_id = u.id
             WHERE c.teacher_id = $1 AND a.attendance_date >= $2 AND a.attendance_date <= $3
             GROUP BY c.id, a.attendance_date, u.username, u.hourly_rate
             ORDER BY a.attendance_date;`,
            [teacherId, fromDate, toDate]
        );
        
        const classes = reportResult.rows;
        if (classes.length === 0) {
            return res.status(404).json({ error: 'No attendance data found for this period.' });
        }

        // 2. Calculate the total salary
        const totalSalary = classes.reduce((sum, row) => {
            const sessionPay = parseFloat(row.hourly_rate) * parseFloat(row.class_duration_hours);
            return sum + sessionPay;
        }, 0);

        // 3. Generate the PDF using pdfkit
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=payslip_${classes[0].teacher_name}_${fromDate}.pdf`,
                'Content-Length': pdfData.length
            }).end(pdfData);
        });
        
        // --- PDF Content ---
        // Header
        doc.fontSize(20).text('Payslip', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Teacher: ${classes[0].teacher_name}`);
        doc.text(`Period: ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`);
        doc.text(`Generated On: ${new Date().toLocaleDateString()}`);
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Date', 50, tableTop);
        doc.text('Class', 150, tableTop);
        doc.text('Duration (hr)', 350, tableTop, { width: 100, align: 'right' });
        doc.text('Session Pay', 450, tableTop, { width: 100, align: 'right' });
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.font('Helvetica');
        doc.moveDown();

        // Table Rows
        classes.forEach(item => {
            const sessionPay = (parseFloat(item.hourly_rate) * parseFloat(item.class_duration_hours)).toFixed(2);
            const rowY = doc.y;
            doc.text(new Date(item.attendance_date).toLocaleDateString(), 50, rowY);
            doc.text(item.class_name, 150, rowY, { width: 200 });
            doc.text(parseFloat(item.class_duration_hours).toFixed(2), 350, rowY, { width: 100, align: 'right' });
            doc.text(sessionPay, 450, rowY, { width: 100, align: 'right' });
            doc.moveDown();
        });

        // Footer / Total
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.font('Helvetica-Bold');
        doc.fontSize(14).text(`Total Salary: NT$${totalSalary.toFixed(2)}`, { align: 'right' });

        doc.end();

    } catch (err) {
        console.error("Error generating payslip PDF:", err);
        res.status(500).json({ error: 'Server error generating payslip.' });
    }
});

module.exports = router;