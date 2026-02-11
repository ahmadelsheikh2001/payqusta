/**
 * Notification Controller — In-App Notifications API
 * Handles fetching, marking as read, and SSE streaming
 */

const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');

class NotificationController {
  /**
   * GET /api/v1/notifications
   * Get paginated notifications for current user
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
      const filter = { tenant: req.tenantId, recipient: req.user._id };

      if (req.query.unread === 'true') filter.isRead = false;
      if (req.query.type) filter.type = req.query.type;

      const [notifications, total] = await Promise.all([
        Notification.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, notifications, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await Notification.getUnreadCount(req.tenantId, req.user._id);
      ApiResponse.success(res, { count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(req, res, next) {
    try {
      await Notification.findOneAndUpdate(
        { _id: req.params.id, tenant: req.tenantId, recipient: req.user._id },
        { isRead: true, readAt: new Date() }
      );
      ApiResponse.success(res, null, 'تم التعليم كمقروء');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      await Notification.markAllRead(req.tenantId, req.user._id);
      ApiResponse.success(res, null, 'تم تعليم الكل كمقروء');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   */
  async deleteOne(req, res, next) {
    try {
      await Notification.findOneAndDelete({
        _id: req.params.id, tenant: req.tenantId, recipient: req.user._id,
      });
      ApiResponse.success(res, null, 'تم حذف الإشعار');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/stream
   * Server-Sent Events (SSE) endpoint for real-time notifications
   */
  async stream(req, res, next) {
    try {
      // SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
      });

      // Send initial ping
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'متصل بنظام الإشعارات' })}\n\n`);

      // Register this client for SSE
      NotificationService.addSSEClient(req.user._id.toString(), res);

      // Keep alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          res.write(`: keepalive\n\n`);
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on close
      req.on('close', () => {
        clearInterval(keepAlive);
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
