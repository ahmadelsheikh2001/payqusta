# 💰 PayQusta — Multi-Vendor SaaS CRM

<div align="center">

**نظام إدارة المبيعات والأقساط الذكي**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://www.mongodb.com)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)

</div>

---

## 📋 نظرة عامة

PayQusta هو نظام CRM متعدد البائعين (Multi-Vendor SaaS) يربط بين **المورد، البائع، والعميل**. يدير المبيعات، المخزون، الأقساط مع إشعارات WhatsApp تلقائية.

### ✨ المميزات الرئيسية

- 🏪 **Multi-Tenant SaaS** — كل بائع له بيئة معزولة بالكامل
- 📱 **Mobile-First** — تصميم responsive مع أنيميشن جذابة
- 💳 **نظام أقساط مرن** — أسبوعي، نصف شهري، شهري
- 📲 **إشعارات WhatsApp** — تذكيرات تلقائية للأقساط والمخزون
- 📊 **لوحة تحكم ذكية** — تحليلات ورسوم بيانية
- 🎮 **نظام نقاط (Gamification)** — مكافآت VIP/Premium
- 🌙 **Dark/Light Mode**
- 🔒 **أمان متقدم** — JWT, Audit Logs, Rate Limiting
- 💰 **بدون ضرائب** — كل الفواتير بدون أي رسوم إضافية

---

## 🏗️ هيكل المشروع

```
payqusta/
├── server.js                    # Entry point
├── package.json
├── .env.example                 # Environment variables template
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── constants.js         # App constants & enums
│   ├── middleware/
│   │   ├── auth.js              # JWT auth, RBAC, tenant isolation
│   │   └── errorHandler.js      # Global error handler
│   ├── models/
│   │   ├── Tenant.js            # Multi-tenant model
│   │   ├── User.js              # Auth & users
│   │   ├── Product.js           # Products & inventory
│   │   ├── Customer.js          # Clients & gamification
│   │   ├── Supplier.js          # Suppliers & payments
│   │   ├── Invoice.js           # Invoices & installments
│   │   └── AuditLog.js          # Security audit trail
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── customerController.js
│   │   ├── supplierController.js
│   │   ├── invoiceController.js
│   │   └── dashboardController.js
│   ├── routes/
│   │   └── index.js             # All API routes
│   ├── services/
│   │   └── WhatsAppService.js   # WhatsApp Business API
│   ├── jobs/
│   │   ├── InstallmentScheduler.js  # Cron: installment reminders
│   │   └── StockMonitorJob.js       # Cron: stock alerts
│   └── utils/
│       ├── AppError.js          # Custom error class
│       ├── ApiResponse.js       # Standardized responses
│       ├── helpers.js           # Utility functions
│       ├── logger.js            # Winston logger
│       └── seeder.js            # Database seeder
└── client/                      # React Frontend (Vite)
```

---

## 🚀 التشغيل

### المتطلبات

- **Node.js** 18+
- **MongoDB** 7+ (أو MongoDB Atlas)
- **npm** 9+

### 1. تثبيت التبعيات

```bash
# Backend
npm install

# Frontend
cd client && npm install
```

### 2. إعداد المتغيرات البيئية

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. تهيئة قاعدة البيانات

```bash
npm run seed
```

### 4. تشغيل المشروع

```bash
# Development (backend + frontend)
npm run dev          # Backend on :5000
npm run client:dev   # Frontend on :5173

# Production
npm run client:build
npm start
```

---

## 🔌 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | تسجيل بائع جديد |
| POST | `/api/v1/auth/login` | تسجيل الدخول |
| GET | `/api/v1/auth/me` | بيانات المستخدم الحالي |

### 📦 Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | جميع المنتجات |
| POST | `/api/v1/products` | إضافة منتج |
| PUT | `/api/v1/products/:id` | تعديل منتج |
| DELETE | `/api/v1/products/:id` | حذف منتج |
| PATCH | `/api/v1/products/:id/stock` | تحديث المخزون |
| GET | `/api/v1/products/low-stock` | المنتجات منخفضة المخزون |

### 👥 Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | جميع العملاء |
| POST | `/api/v1/customers` | إضافة عميل |
| GET | `/api/v1/customers/:id/transactions` | سجل المعاملات |
| GET | `/api/v1/customers/top` | أفضل العملاء |
| GET | `/api/v1/customers/debtors` | العملاء المدينين |

### 🧾 Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/invoices` | جميع الفواتير |
| POST | `/api/v1/invoices` | إنشاء فاتورة (نقد/أقساط) |
| POST | `/api/v1/invoices/:id/pay` | تسجيل دفعة |
| POST | `/api/v1/invoices/:id/pay-all` | سداد كامل |
| POST | `/api/v1/invoices/:id/send-whatsapp` | إرسال WhatsApp |
| GET | `/api/v1/invoices/upcoming-installments` | الأقساط القادمة |

### 🚛 Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/suppliers` | جميع الموردين |
| POST | `/api/v1/suppliers/:id/purchase` | تسجيل شراء |
| POST | `/api/v1/suppliers/:id/pay-all` | سداد كل المستحقات |
| POST | `/api/v1/suppliers/:id/send-reminder` | إرسال تذكير WhatsApp |

### 📊 Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/overview` | نظرة عامة |
| GET | `/api/v1/dashboard/sales-report` | تقرير المبيعات |

---

## 📲 نظام الإشعارات (WhatsApp)

### إشعارات تلقائية:
1. **تذكير قسط العميل** — قبل الموعد بيوم
2. **تذكير قسط المورد** — "خلي بالك انت عليك قسط للمورد X"
3. **تنبيه نفاد المخزون** — مع خيار إعادة تخزين تلقائي
4. **إرسال الفاتورة** — بعد الإنشاء مباشرة
5. **طلب إعادة تخزين** — للمنسق عند انخفاض المخزون

---

## 💳 نظام الأقساط

- **تكرار مرن:** أسبوعي، كل 15 يوم، شهري، كل شهرين
- **مقدم اختياري**
- **حاسبة أقساط تلقائية**
- **سداد كامل في أي وقت**
- **تذكيرات تلقائية عبر WhatsApp**
- **بدون أي ضريبة أو رسوم إضافية**

---

## 🎮 نظام النقاط (Gamification)

| الحدث | النقاط |
|-------|--------|
| كل 1000 ج.م شراء | 10 نقاط |
| سداد القسط في الميعاد | 50 نقطة |
| **Premium** (1000+ نقطة) | خصومات خاصة |
| **VIP** (2000+ نقطة) | أولوية + عروض حصرية |

---

## 🔒 الأمان

- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Multi-Tenant Data Isolation
- ✅ Rate Limiting
- ✅ Audit Logs
- ✅ MongoDB Sanitization (NoSQL Injection)
- ✅ HTTP Parameter Pollution Protection
- ✅ Helmet Security Headers
- ✅ CORS Configuration

---

## 🧪 بيانات الاختبار

بعد تشغيل `npm run seed`:

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| بائع | vendor@payqusta.com | 123456 |
| منسق | coordinator@payqusta.com | 123456 |

---

## 📄 License

PROPRIETARY — PayQusta © 2026

---

<div align="center">
  <strong>Built with ❤️ by PayQusta Team</strong>
</div>
#   p a y q u s t a  
 