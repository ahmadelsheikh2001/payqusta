/**
 * Swagger API Documentation Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PayQusta API',
      version: '1.0.0',
      description: 'PayQusta — Multi-Vendor SaaS CRM for Sales, Inventory & Installment Management API Documentation',
      contact: {
        name: 'PayQusta Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        // Auth
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'vendor@example.com' },
            password: { type: 'string', minLength: 6, example: '123456' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'phone', 'password', 'storeName'],
          properties: {
            name: { type: 'string', example: 'أحمد محمد' },
            email: { type: 'string', format: 'email', example: 'ahmed@example.com' },
            phone: { type: 'string', example: '01012345678' },
            password: { type: 'string', minLength: 6, example: '123456' },
            storeName: { type: 'string', example: 'متجر أحمد' },
            storePhone: { type: 'string', example: '01012345678' },
            storeAddress: { type: 'string', example: 'القاهرة، مصر' },
          },
        },
        // Product
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'هاتف سامسونج' },
            sku: { type: 'string', example: 'SAM-001' },
            barcode: { type: 'string', example: '6281234567890' },
            category: { type: 'string', example: 'إلكترونيات' },
            price: { type: 'number', example: 5000 },
            costPrice: { type: 'number', example: 4000 },
            stock: {
              type: 'object',
              properties: {
                quantity: { type: 'number', example: 50 },
                minQuantity: { type: 'number', example: 5 },
              },
            },
            images: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean', default: true },
          },
        },
        // Customer
        Customer: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'محمد علي' },
            phone: { type: 'string', example: '01098765432' },
            email: { type: 'string', example: 'customer@example.com' },
            address: { type: 'string', example: 'الجيزة، مصر' },
            balance: { type: 'number', example: 1500 },
            totalPurchases: { type: 'number', example: 25000 },
            isActive: { type: 'boolean', default: true },
          },
        },
        // Invoice
        Invoice: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            invoiceNumber: { type: 'string', example: 'INV-001' },
            customer: { type: 'string', description: 'Customer ID' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  quantity: { type: 'number' },
                  price: { type: 'number' },
                },
              },
            },
            totalAmount: { type: 'number', example: 5000 },
            paidAmount: { type: 'number', example: 2000 },
            status: { type: 'string', enum: ['paid', 'partial', 'unpaid', 'overdue'] },
          },
        },
        // Supplier
        Supplier: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'شركة التوريدات' },
            phone: { type: 'string', example: '01011112222' },
            email: { type: 'string' },
            totalOwed: { type: 'number', example: 10000 },
          },
        },
        // Expense
        Expense: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            description: { type: 'string', example: 'إيجار المحل' },
            amount: { type: 'number', example: 3000 },
            category: { type: 'string', example: 'إيجارات' },
            date: { type: 'string', format: 'date' },
          },
        },
        // API Response
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            statusCode: { type: 'number' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Health check endpoint' },
      { name: 'Auth', description: 'Authentication & Authorization' },
      { name: 'Products', description: 'Product management' },
      { name: 'Customers', description: 'Customer management' },
      { name: 'Invoices', description: 'Invoice & Sales management' },
      { name: 'Suppliers', description: 'Supplier management' },
      { name: 'Expenses', description: 'Expense tracking' },
      { name: 'Dashboard', description: 'Dashboard & Analytics' },
      { name: 'Reports', description: 'Business Reports & Excel Export' },
      { name: 'Search', description: 'Global Search' },
      { name: 'Import', description: 'Data Import (CSV/Excel)' },
      { name: 'Backup', description: 'Backup & Restore' },
      { name: 'Notifications', description: 'Notification management' },
      { name: 'Settings', description: 'Store & User settings' },
      { name: 'Admin', description: 'Super Admin management' },
      { name: 'Business Intelligence', description: 'BI & Analytics' },
    ],
  },
  apis: ['./src/docs/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
