/**
 * Field Collection Controller
 * Handles field collector operations
 */

const CollectionTask = require('../models/CollectionTask');
const FieldCollector = require('../models/FieldCollector');
const Route = require('../models/Route');
const RouteOptimizationService = require('../services/routeOptimizationService');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');

// Get today's tasks for collector
exports.getTodayTasks = catchAsync(async (req, res, next) => {
  const collectorId = req.user.fieldCollector?._id;
  
  if (!collectorId) {
    throw AppError.badRequest('المستخدم ليس محصل ميداني');
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const tasks = await CollectionTask.find({
    collector: collectorId,
    createdAt: { $gte: startOfDay },
    status: { $in: ['pending', 'assigned', 'in-progress', 'visited'] }
  })
  .populate('customer')
  .populate('invoice')
  .sort({ priority: -1, dueDate: 1 });

  res.status(200).json(ApiResponse.success(tasks, 'تم الحصول على المهام'));
});

// Get task details
exports.getTask = catchAsync(async (req, res, next) => {
  const task = await CollectionTask.findById(req.params.id)
    .populate('customer')
    .populate('invoice')
    .populate('collector');

  if (!task) {
    throw AppError.notFound('المهمة غير موجودة');
  }

  res.status(200).json(ApiResponse.success(task, 'تم الحصول على المهمة'));
});

// Mark task as visited
exports.visitTask = catchAsync(async (req, res, next) => {
  const task = await CollectionTask.findById(req.params.id);

  if (!task) {
    throw AppError.notFound('المهمة غير موجودة');
  }

  await task.markVisited();

  res.status(200).json(ApiResponse.success(task, 'تم تسجيل الزيارة'));
});

// Collect payment
exports.collectPayment = catchAsync(async (req, res, next) => {
  const { amount, paymentMethod, signature, receiptPhoto, notes } = req.body;
  
  const task = await CollectionTask.findById(req.params.id);

  if (!task) {
    throw AppError.notFound('المهمة غير موجودة');
  }

  if (amount <= 0 || amount > task.amount) {
    throw AppError.badRequest('المبلغ غير صحيح');
  }

  await task.markCollected(amount, paymentMethod, signature, receiptPhoto);
  
  if (notes) {
    task.notes = notes;
    await task.save();
  }

  // Update invoice
  const invoice = await Invoice.findById(task.invoice);
  if (invoice) {
    invoice.paidAmount += amount;
    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partially_paid';
    }
    await invoice.save();
  }

  // Update collector stats
  const collector = await FieldCollector.findById(task.collector);
  if (collector) {
    collector.stats.totalCollected += amount;
    collector.stats.successfulVisits += 1;
    collector.stats.lastActive = new Date();
    await collector.save();
  }

  // Update route stats
  if (task.route) {
    await RouteOptimizationService.updateRouteStats(task.route);
  }

  res.status(200).json(ApiResponse.success(task, 'تم تحصيل المبلغ بنجاح'));
});

// Skip task
exports.skipTask = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  
  const task = await CollectionTask.findById(req.params.id);

  if (!task) {
    throw AppError.notFound('المهمة غير موجودة');
  }

  await task.skip(reason);

  // Update collector stats
  const collector = await FieldCollector.findById(task.collector);
  if (collector) {
    collector.stats.failedVisits += 1;
    await collector.save();
  }

  res.status(200).json(ApiResponse.success(task, 'تم تخطي المهمة'));
});

// Get today's route
exports.getTodayRoute = catchAsync(async (req, res, next) => {
  const collectorId = req.user.fieldCollector?._id;
  
  if (!collectorId) {
    throw AppError.badRequest('المستخدم ليس محصل ميداني');
  }

  const route = await RouteOptimizationService.getTodayRoute(collectorId);

  if (!route) {
    throw AppError.notFound('لا يوجد مسار لليوم');
  }

  res.status(200).json(ApiResponse.success(route, 'تم الحصول على المسار'));
});

// Optimize route
exports.optimizeRoute = catchAsync(async (req, res, next) => {
  const collectorId = req.user.fieldCollector?._id;
  const { taskIds, startLocation } = req.body;
  
  if (!collectorId) {
    throw AppError.badRequest('المستخدم ليس محصل ميداني');
  }

  const tasks = await CollectionTask.find({
    _id: { $in: taskIds },
    collector: collectorId
  });

  if (tasks.length === 0) {
    throw AppError.badRequest('لا توجد مهام للتحسين');
  }

  const route = await RouteOptimizationService.createOptimizedRoute(
    collectorId,
    tasks,
    startLocation
  );

  res.status(201).json(ApiResponse.success(route, 'تم تحسين المسار'));
});

// Track GPS location
exports.trackLocation = catchAsync(async (req, res, next) => {
  const { routeId, lat, lng, accuracy } = req.body;
  
  const route = await Route.findById(routeId);

  if (!route) {
    throw AppError.notFound('المسار غير موجود');
  }

  await route.addGPSPoint(lng, lat, accuracy);

  res.status(200).json(ApiResponse.success(null, 'تم تسجيل الموقع'));
});

// Start route
exports.startRoute = catchAsync(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    throw AppError.notFound('المسار غير موجود');
  }

  await route.start();

  res.status(200).json(ApiResponse.success(route, 'تم بدء المسار'));
});

// Complete route
exports.completeRoute = catchAsync(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    throw AppError.notFound('المسار غير موجود');
  }

  await route.complete();

  res.status(200).json(ApiResponse.success(route, 'تم إنهاء المسار'));
});

// Get all collectors (Admin)
exports.getAllCollectors = catchAsync(async (req, res, next) => {
  const collectors = await FieldCollector.find({ tenant: req.user.tenant })
    .populate('user', 'name email phone')
    .sort('-createdAt');

  res.status(200).json(ApiResponse.success(collectors, 'تم الحصول على المحصلين'));
});

// Get collector statistics
exports.getCollectorStats = catchAsync(async (req, res, next) => {
  const collector = await FieldCollector.findById(req.params.id);

  if (!collector) {
    throw AppError.notFound('المحصل غير موجود');
  }

  const todayPerformance = await collector.getTodayPerformance();

  res.status(200).json(ApiResponse.success({
    collector,
    todayPerformance
  }, 'تم الحصول على الإحصائيات'));
});

// Assign tasks to collector
exports.assignTasks = catchAsync(async (req, res, next) => {
  const { customerIds, collectorId } = req.body;
  
  const collector = await FieldCollector.findById(collectorId);
  if (!collector) {
    throw AppError.notFound('المحصل غير موجود');
  }

  const customers = await Customer.find({
    _id: { $in: customerIds },
    tenant: req.user.tenant
  });

  // Get pending invoices for these customers
  const invoices = await Invoice.find({
    customer: { $in: customerIds },
    status: { $in: ['pending', 'partially_paid'] },
    tenant: req.user.tenant
  });

  // Create collection tasks
  const tasks = [];
  for (const invoice of invoices) {
    const customer = customers.find(c => c._id.equals(invoice.customer));
    
    const task = await CollectionTask.create({
      collector: collectorId,
      customer: customer._id,
      invoice: invoice._id,
      tenant: req.user.tenant,
      amount: invoice.totalAmount - invoice.paidAmount,
      dueDate: invoice.dueDate,
      location: customer.location,
      assignedBy: req.user._id,
      assignedAt: new Date()
    });

    tasks.push(task);
  }

  res.status(201).json(ApiResponse.success(tasks, `تم تعيين ${tasks.length} مهمة`));
});
