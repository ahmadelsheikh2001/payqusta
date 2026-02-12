/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is healthy
 *       503:
 *         description: Server is unhealthy
 */

// ============ AUTH ============

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new vendor
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created successfully
 *       409:
 *         description: Email already exists
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent
 */

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current user data
 */

/**
 * @swagger
 * /auth/update-password:
 *   put:
 *     summary: Update password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated
 */

/**
 * @swagger
 * /auth/update-profile:
 *   put:
 *     summary: Update user profile (name, phone)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /auth/update-avatar:
 *   put:
 *     summary: Upload user avatar
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated
 */

/**
 * @swagger
 * /auth/remove-avatar:
 *   delete:
 *     summary: Remove user avatar
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Avatar removed
 */

// ============ PRODUCTS ============

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, SKU, or barcode
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created
 */

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product data
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Low stock products list
 */

/**
 * @swagger
 * /products/barcode/{code}:
 *   get:
 *     summary: Search product by barcode or SKU
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /products/{id}/stock:
 *   patch:
 *     summary: Update product stock
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *               action:
 *                 type: string
 *                 enum: [add, subtract, set]
 *     responses:
 *       200:
 *         description: Stock updated
 */

/**
 * @swagger
 * /products/{id}/upload-image:
 *   post:
 *     summary: Upload product image
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 */

/**
 * @swagger
 * /products/bulk-delete:
 *   post:
 *     summary: Bulk delete products
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products deleted
 */

// ============ CUSTOMERS ============

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of customers
 *   post:
 *     summary: Create a customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Customer created
 */

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer data
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer updated
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted
 */

/**
 * @swagger
 * /customers/{id}/transactions:
 *   get:
 *     summary: Get customer transaction history
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction history
 */

/**
 * @swagger
 * /customers/{id}/statement-pdf:
 *   get:
 *     summary: Download customer statement PDF
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF statement
 */

/**
 * @swagger
 * /customers/{id}/credit-assessment:
 *   get:
 *     summary: Get customer credit assessment
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Credit assessment data
 */

/**
 * @swagger
 * /customers/bulk-delete:
 *   post:
 *     summary: Bulk delete customers
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Customers deleted
 */

// ============ INVOICES ============

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, partial, unpaid, overdue]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of invoices
 *   post:
 *     summary: Create an invoice
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Invoice'
 *     responses:
 *       201:
 *         description: Invoice created
 */

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice data
 */

/**
 * @swagger
 * /invoices/{id}/pay:
 *   post:
 *     summary: Record payment on invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, card, transfer, other]
 *     responses:
 *       200:
 *         description: Payment recorded
 */

/**
 * @swagger
 * /invoices/{id}/pay-all:
 *   post:
 *     summary: Pay full remaining amount
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full payment recorded
 */

// ============ SUPPLIERS ============

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Suppliers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of suppliers
 *   post:
 *     summary: Create a supplier
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Supplier'
 *     responses:
 *       201:
 *         description: Supplier created
 */

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier data
 *   put:
 *     summary: Update supplier
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier updated
 *   delete:
 *     summary: Delete supplier
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier deleted
 */

/**
 * @swagger
 * /suppliers/{id}/purchase:
 *   post:
 *     summary: Record a purchase from supplier
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase recorded
 */

// ============ EXPENSES ============

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of expenses
 *   post:
 *     summary: Create an expense
 *     tags: [Expenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Expense'
 *     responses:
 *       201:
 *         description: Expense created
 */

/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Update expense
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense updated
 *   delete:
 *     summary: Delete expense
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted
 */

// ============ DASHBOARD ============

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard data
 */

/**
 * @swagger
 * /dashboard/sales-report:
 *   get:
 *     summary: Get sales report
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *     responses:
 *       200:
 *         description: Sales report data
 */

/**
 * @swagger
 * /dashboard/profit-intelligence:
 *   get:
 *     summary: Get profit intelligence analytics
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Profit intelligence data
 */

// ============ REPORTS ============

/**
 * @swagger
 * /reports/sales:
 *   get:
 *     summary: Get sales report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Sales report data
 */

/**
 * @swagger
 * /reports/profit:
 *   get:
 *     summary: Get profit report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Profit report data
 */

/**
 * @swagger
 * /reports/inventory:
 *   get:
 *     summary: Get inventory report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: lowStockOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory report data
 */

/**
 * @swagger
 * /reports/customers:
 *   get:
 *     summary: Get customer report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: minPurchases
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer report data
 */

/**
 * @swagger
 * /reports/products:
 *   get:
 *     summary: Get product performance report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product performance data
 */

/**
 * @swagger
 * /reports/export/{type}:
 *   get:
 *     summary: Export report as Excel
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sales, profit, inventory, customers, products]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */

// ============ SEARCH ============

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Global search across all entities
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search results
 */

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Get search suggestions (autocomplete)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search suggestions
 */

// ============ IMPORT ============

/**
 * @swagger
 * /import/products:
 *   post:
 *     summary: Import products from Excel/CSV
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               duplicateMode:
 *                 type: string
 *                 enum: [skip, update]
 *     responses:
 *       200:
 *         description: Products imported
 */

/**
 * @swagger
 * /import/customers:
 *   post:
 *     summary: Import customers from Excel/CSV
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               duplicateMode:
 *                 type: string
 *                 enum: [skip, update]
 *     responses:
 *       200:
 *         description: Customers imported
 */

/**
 * @swagger
 * /import/preview:
 *   post:
 *     summary: Preview file before import
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File preview data
 */

/**
 * @swagger
 * /import/template/{type}:
 *   get:
 *     summary: Download import template
 *     tags: [Import]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, customers]
 *     responses:
 *       200:
 *         description: Excel template file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */

// ============ BACKUP ============

/**
 * @swagger
 * /backup/export:
 *   get:
 *     summary: Export full data backup (Excel)
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: Backup Excel file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /backup/stats:
 *   get:
 *     summary: Get data counts for backup
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: Data counts
 */

/**
 * @swagger
 * /backup/restore:
 *   post:
 *     summary: Restore data from backup
 *     tags: [Backup]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Data restored
 */

// ============ NOTIFICATIONS ============

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: List of notifications
 */

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Unread count
 */

// ============ SETTINGS ============

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get store settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Settings data
 */

/**
 * @swagger
 * /settings/store:
 *   put:
 *     summary: Update store settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Store settings updated
 */

/**
 * @swagger
 * /settings/whatsapp:
 *   put:
 *     summary: Update WhatsApp settings
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumberId:
 *                 type: string
 *               accessToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: WhatsApp settings updated
 */

// ============ BUSINESS INTELLIGENCE ============

/**
 * @swagger
 * /bi/health-score:
 *   get:
 *     summary: Get business health score
 *     tags: [Business Intelligence]
 *     responses:
 *       200:
 *         description: Health score data
 */

/**
 * @swagger
 * /bi/cash-flow-forecast:
 *   get:
 *     summary: Get cash flow forecast
 *     tags: [Business Intelligence]
 *     responses:
 *       200:
 *         description: Cash flow forecast data
 */

/**
 * @swagger
 * /bi/command-center:
 *   get:
 *     summary: Get command center data
 *     tags: [Business Intelligence]
 *     responses:
 *       200:
 *         description: Command center data
 */

/**
 * @swagger
 * /bi/aging-report:
 *   get:
 *     summary: Get aging report
 *     tags: [Business Intelligence]
 *     responses:
 *       200:
 *         description: Aging report data
 */

// ============ ADMIN ============

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin dashboard data
 */

/**
 * @swagger
 * /admin/statistics:
 *   get:
 *     summary: Get admin statistics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin statistics data
 */

/**
 * @swagger
 * /admin/tenants:
 *   get:
 *     summary: Get all tenants
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tenants
 *   post:
 *     summary: Create a tenant
 *     tags: [Admin]
 *     responses:
 *       201:
 *         description: Tenant created
 */

/**
 * @swagger
 * /admin/tenants/{id}:
 *   put:
 *     summary: Update tenant
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant updated
 *   delete:
 *     summary: Deactivate tenant
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant deactivated
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (all tenants)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of users
 *   post:
 *     summary: Create a user
 *     tags: [Admin]
 *     responses:
 *       201:
 *         description: User created
 */

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit logs
 */
