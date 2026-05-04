import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../lib/ThemeContext';
import { useLedgr } from '../lib/LedgrContext';
import { ExpenseCategory, Expense } from '../lib/store';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, AlertCircle, ShoppingBag, Coffee, Car, Home as HomeIcon, Heart, ShoppingBasket, MoreHorizontal, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

const CATEGORY_ICONS: Record<string, any> = {
  Food: Coffee,
  Transport: Car,
  Bills: HomeIcon,
  Shopping: ShoppingBag,
  Grocery: ShoppingBasket,
  Health: Heart,
  Other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F59E0B',
  Transport: '#3B82F6',
  Bills: '#10B981',
  Shopping: '#EC4899',
  Grocery: '#2DD4BF',
  Health: '#EF4444',
  Other: '#6B7280',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function InsightsScreen() {
  const colors = useThemeColors();
  const { expenses, budget } = useLedgr();

  // Month Selector State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const monthStr = format(selectedDate, 'yyyy-MM');
  const monthLabel = format(selectedDate, 'MMMM yyyy');

  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const toggleCategory = (cat: string) => setExpandedCategory(prev => prev === cat ? null : cat);

  // Filter Data
  const monthExpenses = useMemo(() => {
    return expenses.filter(e => format(new Date(e.date), 'yyyy-MM') === monthStr);
  }, [expenses, monthStr]);

  const totalSpent = useMemo(() => monthExpenses.reduce((sum, e) => sum + e.amount, 0), [monthExpenses]);
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

  // 1. Category Breakdown
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    monthExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount, percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0 }));
  }, [monthExpenses, totalSpent]);

  // 2. Daily Spend Trend
  const dailySpend = useMemo(() => {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const spendByDay: Record<number, number> = {};
    monthExpenses.forEach(e => {
      const day = new Date(e.date).getDate();
      spendByDay[day] = (spendByDay[day] || 0) + e.amount;
    });
    const maxDaily = Math.max(...Object.values(spendByDay), 1); // avoid div by 0
    return days.map(day => ({
      day,
      amount: spendByDay[day] || 0,
      heightPct: ((spendByDay[day] || 0) / maxDaily) * 100
    }));
  }, [monthExpenses, daysInMonth]);

  // 3. Top Spending Items
  const topItems = useMemo(() => {
    const itemsMap: Record<string, { name: string, count: number, total: number }> = {};
    monthExpenses.forEach(e => {
      const key = e.name.toLowerCase().trim();
      if (!itemsMap[key]) itemsMap[key] = { name: e.name, count: 0, total: 0 };
      itemsMap[key].count += 1;
      itemsMap[key].total += e.amount;
    });
    return Object.values(itemsMap).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [monthExpenses]);

  // 4. Category Budget vs. Actual (View-Only)
  const categoryBudgets = useMemo(() => {
    return Object.entries(budget.categories).map(([cat, limit]) => {
      const spent = monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      return {
        category: cat,
        limit,
        spent,
        progress: limit > 0 ? Math.min((spent / limit) * 100, 100) : 0,
        isOver: spent > limit
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [monthExpenses, budget]);

  // 5. Repeat Purchase Analyzer
  const repeatPurchases = useMemo(() => {
    return topItems.filter(item => item.count > 1);
  }, [topItems]);

  // 6. Avg Daily Spend + Projection
  const spendStats = useMemo(() => {
    const isCurrentMonth = format(new Date(), 'yyyy-MM') === monthStr;
    const daysElapsed = isCurrentMonth ? Math.max(new Date().getDate(), 1) : daysInMonth;
    const avgDaily = totalSpent / daysElapsed;
    const projected = isCurrentMonth ? avgDaily * daysInMonth : totalSpent;
    return { avgDaily, projected, isCurrentMonth };
  }, [totalSpent, daysInMonth, monthStr]);

  // 7. Food vs. Essential Spend Ratio
  const splitRatio = useMemo(() => {
    const discretionaryCats = ['Food', 'Shopping', 'Other'];
    const essentialCats = ['Grocery', 'Transport', 'Bills', 'Health'];
    
    let discretionary = 0;
    let essential = 0;
    
    monthExpenses.forEach(e => {
      if (discretionaryCats.includes(e.category)) discretionary += e.amount;
      else if (essentialCats.includes(e.category)) essential += e.amount;
    });
    
    const total = discretionary + essential;
    const discPct = total > 0 ? (discretionary / total) * 100 : 0;
    
    return { discretionary, essential, discPct, total };
  }, [monthExpenses]);

  // 8. Most Expensive Single Days
  const topDays = useMemo(() => {
    const spendByDate: Record<string, { date: string, total: number, items: Expense[] }> = {};
    monthExpenses.forEach(e => {
      const d = format(new Date(e.date), 'yyyy-MM-dd');
      if (!spendByDate[d]) spendByDate[d] = { date: d, total: 0, items: [] };
      spendByDate[d].total += e.amount;
      spendByDate[d].items.push(e);
    });
    return Object.values(spendByDate)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [monthExpenses]);

  // 9. Week-over-Week Comparison
  const weeklySpend = useMemo(() => {
    const weeks = [
      { label: 'Week 1', total: 0 },
      { label: 'Week 2', total: 0 },
      { label: 'Week 3', total: 0 },
      { label: 'Week 4+', total: 0 }
    ];
    monthExpenses.forEach(e => {
      const day = new Date(e.date).getDate();
      if (day <= 7) weeks[0].total += e.amount;
      else if (day <= 14) weeks[1].total += e.amount;
      else if (day <= 21) weeks[2].total += e.amount;
      else weeks[3].total += e.amount;
    });
    const maxWeek = Math.max(...weeks.map(w => w.total), 1);
    return weeks.map(w => ({ ...w, heightPct: (w.total / maxWeek) * 100 }));
  }, [monthExpenses]);

  // 10. Smart Suggestions Panel
  const suggestions = useMemo(() => {
    const tips: string[] = [];
    const overspentCat = categoryBudgets.find(c => c.isOver);
    if (overspentCat) {
      tips.push(`You've exceeded your budget in ${overspentCat.category} by PKR ${(overspentCat.spent - overspentCat.limit).toLocaleString()}.`);
    } else if (categoryBudgets.length > 0) {
      tips.push("Great job! You're staying within your category limits.");
    }

    if (repeatPurchases.length > 0) {
      const topRepeat = repeatPurchases[0];
      if (topRepeat.count > 3) {
        tips.push(`You bought "${topRepeat.name}" ${topRepeat.count} times this month. Consider buying in bulk to save money.`);
      }
    }

    if (spendStats.isCurrentMonth && spendStats.projected > budget.total) {
      tips.push(`At this pace, you're projected to spend PKR ${Math.round(spendStats.projected).toLocaleString()} by month-end, exceeding your total budget.`);
    }

    if (topDays.length > 0) {
      const biggestDay = new Date(topDays[0].date).getDate();
      const suffix = biggestDay > 3 && biggestDay < 21 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][biggestDay % 10];
      tips.push(`The ${biggestDay}${suffix} was your most expensive day, costing PKR ${topDays[0].total.toLocaleString()}.`);
    }

    return tips;
  }, [categoryBudgets, repeatPurchases, spendStats, topDays, budget.total]);

  // Empty State Check
  if (monthExpenses.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Insights</Text>
        </View>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn}>
            <ChevronLeft color={colors.textPrimary} size={24} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.monthBtn}>
            <ChevronRight color={colors.textPrimary} size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <AlertCircle color={colors.textTertiary} size={48} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data for {monthLabel}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Insights</Text>
      </View>
      
      <View style={[styles.monthSelector, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn}>
          <ChevronLeft color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthBtn}>
          <ChevronRight color={colors.textPrimary} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. Category Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Category Breakdown</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
            <View style={styles.donutRow}>
              <View style={styles.donutContainer}>
                <Svg width={140} height={140} viewBox="0 0 100 100">
                  <G rotation="-90" origin="50, 50">
                    {(() => {
                      let cumulativePercent = 0;
                      return categoryTotals.map(({ category, percentage }) => {
                        if (percentage <= 0) return null;
                        const strokeDasharray = `${(percentage / 100) * 251.2} 251.2`;
                        const strokeDashoffset = -cumulativePercent * 251.2;
                        cumulativePercent += (percentage / 100);
                        return (
                          <Circle
                            key={category}
                            cx="50"
                            cy="50"
                            r="40"
                            stroke={CATEGORY_COLORS[category] || colors.accent}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            fill="none"
                            strokeLinecap="butt"
                          />
                        );
                      });
                    })()}
                  </G>
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={[styles.donutTotalLabel, { color: colors.textTertiary }]}>TOTAL</Text>
                  <Text style={[styles.donutTotalValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {totalSpent >= 100000 ? `${(totalSpent / 1000).toFixed(0)}k` : totalSpent.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={styles.legendContainer}>
                {categoryTotals.slice(0, 5).map(cat => (
                  <View key={cat.category} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat.category] || colors.accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legendCat, { color: colors.textPrimary }]} numberOfLines={1}>{cat.category}</Text>
                      <Text style={[styles.legendAmt, { color: colors.textTertiary }]}>PKR {cat.amount.toLocaleString()}</Text>
                    </View>
                    <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{cat.percentage.toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 2. Daily Spend Trend */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Spend Trend</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle, padding: 16 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
              {dailySpend.map(d => (
                <View key={d.day} style={styles.barContainer}>
                  <View style={styles.barBg}>
                    <View style={[
                      styles.barFill, 
                      { height: `${d.heightPct}%`, backgroundColor: d.heightPct === 100 ? colors.danger : colors.accent }
                    ]} />
                    {d.amount > 0 && (
                      <Text style={[styles.barValue, { color: colors.textTertiary, position: 'absolute', bottom: `${d.heightPct}%`, left: -10, width: 32, textAlign: 'center' }]}>
                         {d.amount >= 1000 ? `${(d.amount/1000).toFixed(1)}k` : d.amount.toString()}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{d.day}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 3. Top Spending Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Spending Items</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
            {topItems.map((item, index) => (
              <View key={index} style={[styles.listItem, index < topItems.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                <View style={styles.listLeft}>
                  <Text style={[styles.itemRank, { color: colors.textTertiary, backgroundColor: colors.divider }]}>#{index + 1}</Text>
                  <View>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.itemFreq, { color: colors.textTertiary }]}>Purchased {item.count}x</Text>
                  </View>
                </View>
                <Text style={[styles.itemTotal, { color: colors.textPrimary }]}><Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>PKR </Text>{item.total.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Category Budget vs. Actual */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Category Budgets</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
            {categoryBudgets.filter(c => c.limit > 0 || c.spent > 0).map((cat, index) => (
              <View key={cat.category}>
                <TouchableOpacity 
                  style={[styles.budgetRow, index < categoryBudgets.length - 1 && expandedCategory !== cat.category && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}
                  onPress={() => toggleCategory(cat.category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.budgetHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.budgetCatName, { color: colors.textPrimary, marginRight: 6 }]}>{cat.category}</Text>
                      {expandedCategory === cat.category ? (
                        <ChevronUp size={14} color={colors.textTertiary} />
                      ) : (
                        <ChevronDown size={14} color={colors.textTertiary} />
                      )}
                    </View>
                    <Text style={[styles.budgetAmt, { color: cat.isOver ? colors.danger : colors.textPrimary }]}>
                      <Text style={{ color: colors.textTertiary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>PKR </Text>{cat.spent.toLocaleString()} <Text style={{ color: colors.textTertiary, fontFamily: 'Inter_500Medium' }}>/ {cat.limit > 0 ? cat.limit.toLocaleString() : 'No Limit'}</Text>
                    </Text>
                  </View>
                  {cat.limit > 0 && (
                    <View style={[styles.progressBarBg, { backgroundColor: colors.divider }]}>
                      <View style={[styles.progressBarFill, { width: `${cat.progress}%`, backgroundColor: cat.isOver ? colors.danger : colors.accent }]} />
                    </View>
                  )}
                </TouchableOpacity>
                {expandedCategory === cat.category && (
                  <View style={[styles.expandedCategoryList, index < categoryBudgets.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                    {monthExpenses.filter(e => e.category === cat.category).map(exp => (
                      <View key={exp.id} style={styles.expandedExpRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.expandedExpName, { color: colors.textSecondary }]} numberOfLines={1}>{exp.name}</Text>
                          <Text style={[styles.expandedExpDate, { color: colors.textTertiary }]}>{format(new Date(exp.date), 'MMM do')}</Text>
                        </View>
                        <Text style={[styles.expandedExpAmt, { color: colors.textPrimary }]}>PKR {exp.amount.toLocaleString()}</Text>
                      </View>
                    ))}
                    {monthExpenses.filter(e => e.category === cat.category).length === 0 && (
                      <Text style={[styles.expandedExpDate, { color: colors.textTertiary, paddingVertical: 8 }]}>No expenses this month.</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* 5. Repeat Purchase Analyzer */}
        {repeatPurchases.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Repeat Purchases</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
              {repeatPurchases.map((item, index) => (
                <View key={index} style={[styles.listItem, index < repeatPurchases.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                  <View style={styles.listLeft}>
                    <View>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.itemFreq, { color: colors.textTertiary }]}>Bought {item.count} times</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemTotal, { color: colors.textPrimary }]}>PKR {item.total.toLocaleString()}</Text>
                    {item.count > 3 && (
                      <View style={[styles.bulkBadge, { backgroundColor: colors.success + '20' }]}>
                        <Text style={[styles.bulkBadgeText, { color: colors.success }]}>Buy Bulk</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. Avg Daily Spend + Projection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pace & Projection</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>AVG. DAILY</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>PKR {Math.round(spendStats.avgDaily).toLocaleString()}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{spendStats.isCurrentMonth ? 'PROJECTED' : 'TOTAL'}</Text>
              <Text style={[styles.statValue, { color: colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>PKR {Math.round(spendStats.projected).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* 7. Spend Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Spend Type</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
              <View style={styles.spendTypeHeader}>
                <Text style={[styles.spendTypeLabel, { color: colors.success }]}>ESSENTIALS (NEEDS)</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary, marginBottom: 4 }]} numberOfLines={1} adjustsFontSizeToFit>PKR {splitRatio.essential.toLocaleString()}</Text>
              <Text style={[styles.spendTypeDesc, { color: colors.textTertiary }]}>Grocery, Transport, Health, Bills</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
              <View style={styles.spendTypeHeader}>
                <Text style={[styles.spendTypeLabel, { color: colors.warning }]}>DISCRETIONARY (WANTS)</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary, marginBottom: 4 }]} numberOfLines={1} adjustsFontSizeToFit>PKR {splitRatio.discretionary.toLocaleString()}</Text>
              <Text style={[styles.spendTypeDesc, { color: colors.textTertiary }]}>Food, Shopping, Other</Text>
            </View>
          </View>
        </View>

        {/* 8. Most Expensive Single Days */}
        {topDays.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Highest Spend Days</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
              {topDays.map((day, index) => (
                <View key={day.date} style={[styles.dayRow, index < topDays.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.dayDate, { color: colors.textPrimary }]}>{format(new Date(day.date), 'MMM do')}</Text>
                    <Text style={[styles.dayTotal, { color: colors.danger }]}>PKR {day.total.toLocaleString()}</Text>
                  </View>
                  <Text style={[styles.dayItems, { color: colors.textTertiary }]} numberOfLines={1}>
                    {day.items.map(i => i.name).join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 9. Week-over-Week Comparison */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Week-over-Week</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle, padding: 16 }]}>
            <View style={styles.wowChart}>
              {weeklySpend.map((week, idx) => (
                <View key={idx} style={styles.wowCol}>
                  <View style={styles.wowBarBg}>
                    <View style={[styles.wowBarFill, { height: `${week.heightPct}%`, backgroundColor: colors.accent }]} />
                  </View>
                  <Text style={[styles.wowLabel, { color: colors.textTertiary }]}>{week.label}</Text>
                  <Text style={[styles.wowAmt, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {week.total >= 1000 ? `${(week.total/1000).toFixed(1)}k` : week.total}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 10. Smart Suggestions Panel */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Insights & Tips</Text>
          <View style={[styles.tipsCard, { backgroundColor: colors.innerCardBg, borderColor: colors.cardBorderSubtle }]}>
            {suggestions.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <Lightbulb color={colors.warning} size={18} style={{ marginRight: 12, marginTop: 2 }} />
                <Text style={[styles.tipText, { color: colors.textPrimary }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontFamily: 'Outfit_800ExtraBold', fontSize: 24, letterSpacing: 1 },
  
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, borderWidth: 1, marginTop: 12, marginBottom: 20, gap: 16 },
  monthBtn: { padding: 4 },
  monthLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, marginBottom: 16 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1 },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 16, marginTop: 12 },

  donutRow: { flexDirection: 'row', alignItems: 'center' },
  donutContainer: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutTotalLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  donutTotalValue: { fontFamily: 'Outfit_700Bold', fontSize: 20, marginTop: -2 },
  legendContainer: { flex: 1, marginLeft: 20, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendCat: { fontFamily: 'Inter_700Bold', fontSize: 11, marginBottom: 2 },
  legendAmt: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  legendPct: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, marginLeft: 8 },

  chartScroll: { paddingRight: 16, gap: 8, alignItems: 'flex-end', height: 165 },
  barContainer: { width: 32, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginBottom: 4, height: 12 },
  barBg: { width: 12, height: 120, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 6, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 8 },

  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  listLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemRank: { fontFamily: 'Outfit_800ExtraBold', fontSize: 12, width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, overflow: 'hidden', marginRight: 12 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 2 },
  itemFreq: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  itemTotal: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },

  budgetRow: { paddingVertical: 14 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetCatName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  budgetAmt: { fontFamily: 'Outfit_700Bold', fontSize: 14 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  expandedCategoryList: { paddingBottom: 12, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 12, marginTop: 8 },
  expandedExpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  expandedExpName: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 2 },
  expandedExpDate: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  expandedExpAmt: { fontFamily: 'Outfit_600SemiBold', fontSize: 13 },

  bulkBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  bulkBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, textTransform: 'uppercase' },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, marginBottom: 6 },
  statValue: { fontFamily: 'Outfit_700Bold', fontSize: 20 },

  spendTypeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  spendTypeLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  spendTypeDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },

  dayRow: { paddingVertical: 12 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dayDate: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  dayTotal: { fontFamily: 'Outfit_700Bold', fontSize: 16 },
  dayItems: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  wowChart: { flexDirection: 'row', justifyContent: 'space-between', height: 160, alignItems: 'flex-end', paddingTop: 20 },
  wowCol: { alignItems: 'center', flex: 1 },
  wowBarBg: { width: 32, height: 100, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  wowBarFill: { width: '100%', borderRadius: 8 },
  wowLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginTop: 10, marginBottom: 2 },
  wowAmt: { fontFamily: 'Outfit_500Medium', fontSize: 12 },

  tipsCard: { borderRadius: 16, padding: 20, borderWidth: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  tipText: { fontFamily: 'Inter_500Medium', fontSize: 14, flex: 1, lineHeight: 20 },
});
