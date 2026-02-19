const User = require('../models/User');

const BADGES = {
  FIRST_SALE: { id: 'FIRST_SALE', name: 'بداية الانطلاق', icon: '🚀', description: 'إتمام أول عملية بيع' },
  TARGET_HIT: { id: 'TARGET_HIT', name: 'قناص التارجت', icon: '🎯', description: 'تحقيق الهدف اليومي' },
  HIGH_ROLLER: { id: 'HIGH_ROLLER', name: 'بيعة كبيرة', icon: '💎', description: 'فاتورة تزيد عن 5000 ج.م' },
  STREAK_3: { id: 'STREAK_3', name: 'شعلة نشاط', icon: '🔥', description: 'تحقيق التارجت 3 أيام متتالية' },
  LEVEL_5: { id: 'LEVEL_5', name: 'بائع محترف', icon: '⭐', description: 'الوصول للمستوى 5' }
};

class GamificationService {
  
  /**
   * Add XP to user and handle level up
   */
  async addXP(userId, amount) {
    const user = await User.findById(userId);
    if (!user) return;

    user.gamification = user.gamification || {};
    user.gamification.points = (user.gamification.points || 0) + amount;

    // Level calculation: Level = sqrt(XP / 100)
    // 100 XP = Lvl 1, 400 XP = Lvl 2, 900 XP = Lvl 3
    const newLevel = Math.floor(Math.sqrt(user.gamification.points / 100)) + 1;
    
    if (newLevel > (user.gamification.level || 1)) {
      user.gamification.level = newLevel;
      // Potential notification here
    }

    await user.save();
    return user.gamification;
  }

  /**
   * Check for badges and targets after a sale
   */
  async checkAchievements(userId, currentInvoiceAmount) {
    const user = await User.findById(userId);
    if (!user) return;
    
    const stats = user.gamification || {};
    const today = new Date();
    today.setHours(0,0,0,0);

    const badgesToAdd = [];

    // 1. First Sale Badge
    if (!this.hasBadge(user, 'FIRST_SALE')) {
      badgesToAdd.push(BADGES.FIRST_SALE.id);
    }

    // 2. High Roller (Single invoice > 5000)
    if (currentInvoiceAmount >= 5000 && !this.hasBadge(user, 'HIGH_ROLLER')) {
      badgesToAdd.push(BADGES.HIGH_ROLLER.id);
    }

    // 3. Daily Target Logic is handled usually by aggregating daily sales
    // We can assume this method is called after aggregation or we do aggregation here
    // For simplicity, we just save the badges we found so far.
    // Real "Target Hit" check requires knowing TOTAL daily sales, not just this invoice.
    
    if (badgesToAdd.length > 0) {
      badgesToAdd.forEach(id => {
        if (!this.hasBadge(user, id)) {
          user.gamification.badges.push({ id, awardedAt: new Date() });
        }
      });
      await user.save();
    }
  }

  /**
   * Check Daily Target (Called periodically or after sale aggregation)
   */
  async checkDailyTarget(userId, dailyTotalSales) {
    const user = await User.findById(userId);
    if (!user) return;

    const target = user.gamification.dailyTarget || 1000;
    
    if (dailyTotalSales >= target) {
      // Award Badge if not already awarded TODAY
      // This logic is simplified; usually we check if badge awarded today
      if (!this.hasBadge(user, 'TARGET_HIT')) {
         user.gamification.badges.push({ id: BADGES.TARGET_HIT.id, awardedAt: new Date() });
         await user.save();
         return { targetMet: true, newBadge: BADGES.TARGET_HIT };
      }
    }
    return { targetMet: dailyTotalSales >= target };
  }

  hasBadge(user, badgeId) {
    return user.gamification?.badges?.some(b => b.id === badgeId);
  }
}

module.exports = new GamificationService();
