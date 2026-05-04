import React, { useState } from 'react';
import { format } from 'date-fns';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { useLedgr } from '../lib/LedgrContext';
import { useThemeColors } from '../lib/ThemeContext';
import { ExpenseCategory, Expense } from '../lib/store';
import { Wallet, Target, TrendingUp, Coffee, Car, Home as HomeIcon, ShoppingBag, Heart, MoreHorizontal, AlertCircle, ShoppingBasket, CheckCircle2, Minus, Info, TrendingDown } from 'lucide-react-native';
import EditExpenseModal from '../components/EditExpenseModal';
import DailyDetailModal from '../components/DailyDetailModal';
import TransactionsModal from '../components/TransactionsModal';
import { getDaysRemainingInMonth } from '../lib/dateUtils';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: '#FFD700',
  Transport: '#3B82F6',
  Bills: '#EF4444',
  Shopping: '#8A2BE2',
  Grocery: '#10B981',
  Health: '#EC4899',
  Other: '#949494',
};

const CATEGORY_ICONS: Record<ExpenseCategory, any> = {
  Food: Coffee,
  Transport: Car,
  Bills: HomeIcon,
  Shopping: ShoppingBag,
  Grocery: ShoppingBasket,
  Health: Heart,
  Other: MoreHorizontal,
};

export default function DashboardScreen() {
  const { expenses, budget, isLoaded, allCategories } = useLedgr();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDailyDetailVisible, setIsDailyDetailVisible] = useState(false);
  const [isTransactionsModalVisible, setIsTransactionsModalVisible] = useState(false);

  const currentMonthExpenses = React.useMemo(() => {
    const activeMonth = budget.budgetMonth || format(new Date(), 'yyyy-MM');
    return expenses.filter(e => format(new Date(e.date), 'yyyy-MM') === activeMonth);
  }, [expenses, budget.budgetMonth]);

  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = budget.total - totalSpent;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = getDaysRemainingInMonth();
  const dailyAllowance = Math.max(0, remainingBudget / daysLeft);

  const dailyTarget = budget.total / daysInMonth;
  const ratio = dailyAllowance / dailyTarget;

  const getDailyStatus = () => {
    if (ratio >= 1.5) return {
      label: 'COMFORTABLE',
      color: colors.success,
      bgColor: colors.successBg,
      description: "You're spending significantly less than your planned daily average. You have breathing room for miscellaneous costs.",
      threshold: ">= 1.5x target",
      icon: CheckCircle2
    };
    if (ratio >= 1.0) return {
      label: 'ON TRACK',
      color: colors.warning,
      bgColor: colors.warningBg,
      description: "Your daily spending is perfectly aligned with your monthly budget goal. Keep maintaining this pace.",
      threshold: "1.0x to 1.5x target",
      icon: TrendingUp
    };
    if (ratio >= 0.6) return {
      label: 'TIGHT',
      color: colors.warning,
      bgColor: colors.warningBg,
      description: "You're slightly below your daily target. It's time to prioritize essential spending only to finish the month on budget.",
      threshold: "0.6x to 1.0x target",
      icon: Minus
    };
    if (ratio >= 0.3) return {
      label: 'CRITICAL',
      color: colors.danger,
      bgColor: colors.dangerBg,
      description: "Your available daily budget is very low. High alert! Immediate reduction in non-essential spending is required.",
      threshold: "0.3x to 0.6x target",
      icon: AlertCircle
    };
    return {
      label: 'OVERSPENT',
      color: colors.danger,
      bgColor: colors.dangerBg,
      description: "You have exceeded your sustainable daily limit. Every rupee spent now contributes to a monthly deficit.",
      threshold: "< 0.3x target",
      icon: TrendingDown
    };
  };

  const dailyStatus = getDailyStatus();

  const categoryTotals: Record<string, number> = {};
  currentMonthExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const isOverspent = remainingBudget < 0;

  if (!isLoaded) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTopLeft}>
              <Image source={require('../../assets/logo.png')} style={styles.logoSmall} resizeMode="contain" />
              <Text style={[styles.brandNameSmall, { color: colors.textTertiary }]}>LEDGR</Text>
            </View>
            <Text style={[styles.headerTitleSmall, { color: colors.textPrimary }]}>Overview</Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.kpiIconBox}><Target color={colors.iconMuted} size={16} opacity={0.5} /></View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>BUDGET</Text>
            <View style={styles.kpiValueStack}>
              <Text style={[styles.kpiCurrencySmall, { color: colors.textTertiary }]}>PKR</Text>
              <Text style={[styles.kpiValueSmall, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{budget.total.toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.kpiCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.kpiIconBox}><Wallet color={colors.accent} size={16} opacity={0.5} /></View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>SPENT</Text>
            <View style={styles.kpiValueStack}>
              <Text style={[styles.kpiCurrencySmall, { color: colors.textTertiary }]}>PKR</Text>
              <Text style={[styles.kpiValueSmall, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{totalSpent.toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.kpiCardSmall, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.kpiIconBox}><TrendingUp color={colors.purple} size={16} opacity={0.5} /></View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>REMAINING</Text>
            <View style={styles.kpiValueStack}>
              <Text style={[styles.kpiCurrencySmall, { color: colors.textTertiary }]}>PKR</Text>
              <Text style={[styles.kpiValueSmall, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{remainingBudget.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { width: '100%', backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.kpiRowSplit}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>DAILY ALLOWANCE ({daysLeft} DAYS LEFT)</Text>
                <View style={styles.kpiValueRow}>
                  <Text style={[styles.kpiCurrency, { color: colors.textTertiary }]}>PKR</Text>
                  <Text style={[styles.kpiValueLarge, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{Math.floor(dailyAllowance).toLocaleString()}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.badge, { backgroundColor: dailyStatus.bgColor, borderColor: dailyStatus.color, flexShrink: 0 }]}
                onPress={() => setIsDailyDetailVisible(true)}
              >
                <Text style={[styles.badgeText, { color: dailyStatus.color }]} numberOfLines={1} adjustsFontSizeToFit>
                  {dailyStatus.label}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Category Visualization Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Spending Breakdown</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>Insights by category</Text>
        </View>

        <View style={[styles.vizCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
          <View style={styles.vizRow}>
            <View style={styles.donutContainer}>
              <Svg width={140} height={140} viewBox="0 0 100 100">
                <G rotation="-90" origin="50, 50">
                  {totalSpent === 0 ? (
                    <Circle cx="50" cy="50" r="40" stroke={colors.divider} strokeWidth="12" fill="none" />
                  ) : (
                    (() => {
                      let cumulativePercent = 0;
                      return allCategories.map((cat, index) => {
                        const spent = categoryTotals[cat] || 0;
                        if (spent <= 0) return null;
                        const percent = spent / totalSpent;
                        const strokeDasharray = `${percent * 251.2} 251.2`;
                        const strokeDashoffset = -cumulativePercent * 251.2;
                        cumulativePercent += percent;
                        return (
                          <Circle
                            key={cat}
                            cx="50"
                            cy="50"
                            r="40"
                            stroke={CATEGORY_COLORS[cat as ExpenseCategory] || colors.accent}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            fill="none"
                            strokeLinecap="butt"
                          />
                        );
                      });
                    })()
                  )}
                </G>
              </Svg>
              <View style={styles.donutCenter}>
                <Text style={[styles.donutTotalLabel, { color: colors.textTertiary }]}>TOTAL</Text>
                <Text style={[styles.donutTotalValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {totalSpent >= 100000 ? `${(totalSpent / 1000).toFixed(0)}k` : totalSpent.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.vizList}>
              {allCategories
                .filter(cat => (categoryTotals[cat] || 0) > 0)
                .sort((a, b) => (categoryTotals[b] || 0) - (categoryTotals[a] || 0))
                .slice(0, 4)
                .map(cat => {
                  const spent = categoryTotals[cat] || 0;
                  const percent = Math.round((spent / totalSpent) * 100);
                  const color = CATEGORY_COLORS[cat as ExpenseCategory] || colors.accent;
                  return (
                    <View key={cat} style={styles.vizListItem}>
                      <View style={[styles.vizDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.vizCatName, { color: colors.textPrimary }]}>{cat}</Text>
                        <Text style={[styles.vizCatAmt, { color: colors.textTertiary }]}>PKR {spent.toLocaleString()}</Text>
                      </View>
                      <Text style={[styles.vizCatPercent, { color: colors.textSecondary }]}>{percent}%</Text>
                    </View>
                  );
                })}
              {allCategories.filter(cat => (categoryTotals[cat] || 0) > 0).length === 0 && (
                <Text style={[styles.noDataText, { color: colors.textTertiary }]}>No spending recorded yet this month.</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Category Remaining</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>Budgets per category</Text>
        </View>

        <View style={styles.catBudgetGrid}>
          {allCategories.map(cat => {
            const Icon = CATEGORY_ICONS[cat as ExpenseCategory] || MoreHorizontal;
            const spent = categoryTotals[cat] || 0;
            const limit = budget.categories[cat] || 0;
            const remaining = limit - spent;
            const isOver = remaining < 0;
            const progress = Math.min(1, spent / (limit || 1));
            const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

            return (
              <View key={cat} style={[styles.catBudgetCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
                <View style={styles.catCardTop}>
                  <View style={[styles.catIconBox, { backgroundColor: colors.pillBg }, isOver && styles.catIconBoxDanger]}>
                    <Icon color={isOver ? colors.danger : colors.iconDefault} size={14} />
                  </View>
                  <Text style={[styles.catCardName, { color: colors.textSecondary }]} numberOfLines={1}>{cat}</Text>
                  <Text style={[styles.compactPercent, { color: isOver ? colors.danger : colors.accent }]}>{percentUsed}%</Text>
                </View>

                <View style={styles.compactMetaRow}>
                  <Text style={[styles.catRemainingCompact, { color: isOver ? colors.danger : colors.textPrimary }]}>
                    PKR {Math.abs(remaining).toLocaleString()}
                  </Text>
                  <Text style={[styles.compactStatusLabel, { color: colors.textTertiary }]}>{isOver ? 'OVER' : 'LEFT'}</Text>
                </View>

                <View style={[styles.progressBarBgCompact, { backgroundColor: colors.divider }]}>
                  <View style={[styles.progressBarFillCompact, { width: `${progress * 100}%`, backgroundColor: colors.accent }, isOver && { backgroundColor: colors.danger }]} />
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Transactions</Text>
          <TouchableOpacity 
            style={[styles.viewAllBtn, { backgroundColor: colors.pillBg, borderColor: colors.cardBorderSubtle }]} 
            onPress={() => setIsTransactionsModalVisible(true)}
          >
            <Text style={[styles.viewAllText, { color: colors.accent }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expensesList}>
          {currentMonthExpenses.slice(0, 10).map((expense) => {
            const Icon = CATEGORY_ICONS[expense.category as ExpenseCategory] || MoreHorizontal;
            return (
              <TouchableOpacity
                key={expense.id}
                onPress={() => {
                  setEditingExpense(expense);
                  setIsEditModalVisible(true);
                }}
              >
                <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={[styles.listCard, { borderColor: colors.cardBorderSubtle }]}>
                  <View style={styles.listCardRow}>
                    <View style={styles.airlineGroup}>
                      <View style={[styles.iconBox, { backgroundColor: colors.pillBg, borderColor: colors.cardBorder }]}>
                        <Icon color={colors.iconDefault} size={18} />
                      </View>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={[styles.expenseName, { color: colors.textPrimary }]} numberOfLines={2}>{expense.name}</Text>
                        <Text style={[styles.expenseCat, { color: colors.textSecondary }]}>{expense.category}</Text>
                      </View>
                    </View>
                    <View style={styles.listRight}>
                      <Text style={[styles.listAmount, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                        PKR {expense.amount.toLocaleString()}
                      </Text>
                      <Text style={[styles.listDate, { color: colors.textSecondary }]}>{new Date(expense.date).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <EditExpenseModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        expense={editingExpense}
      />

      <DailyDetailModal
        visible={isDailyDetailVisible}
        onClose={() => setIsDailyDetailVisible(false)}
        data={{
          dailyTarget,
          dailyRemaining: dailyAllowance,
          ratio,
          daysLeft,
          status: dailyStatus
        }}
      />

      <TransactionsModal
        visible={isTransactionsModalVisible}
        onClose={() => setIsTransactionsModalVisible(false)}
        onEditExpense={(expense) => {
          setEditingExpense(expense);
          setIsEditModalVisible(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  header: { marginBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, width: '100%' },
  headerTopLeft: { flexDirection: 'row', alignItems: 'center' },
  headerDivider: { width: 1, height: 12, marginHorizontal: 12, opacity: 0.3 },
  headerTitleSmall: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 },
  logoSmall: { width: 18, height: 18, marginRight: 10 },
  brandNameSmall: { fontFamily: 'Outfit_800ExtraBold', fontSize: 10, letterSpacing: 2 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 2 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpiCard: { minHeight: 110, flex: 1, minWidth: '45%', padding: 20, borderRadius: 24, borderWidth: 1, position: 'relative', overflow: 'hidden' },
  kpiCardSmall: { minHeight: 100, flex: 1, minWidth: '30%', padding: 14, borderRadius: 20, borderWidth: 1, position: 'relative', overflow: 'hidden' },
  kpiIconBox: { position: 'absolute', top: 14, right: 14 },
  kpiLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 8 },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  kpiValueStack: { marginTop: 4 },
  kpiCurrency: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  kpiCurrencySmall: { fontSize: 8, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  kpiValueSmall: { fontSize: 20, fontFamily: 'Outfit_300Light', flex: 1 },
  kpiRowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiValueLarge: { fontSize: 36, fontFamily: 'Outfit_300Light' },

  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 10, letterSpacing: 1 },

  sectionHeader: { marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 20 },
  sectionSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  viewAllBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1 
  },
  viewAllText: { 
    fontFamily: 'Outfit_600SemiBold', 
    fontSize: 12 
  },

  vizCard: { width: '100%', borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 24 },
  vizRow: { flexDirection: 'row', alignItems: 'center' },
  donutContainer: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutTotalLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  donutTotalValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, marginTop: -2 },
  vizList: { flex: 1, marginLeft: 24, gap: 12 },
  vizListItem: { flexDirection: 'row', alignItems: 'center' },
  vizDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  vizCatName: { fontFamily: 'Inter_700Bold', fontSize: 11, marginBottom: 2 },
  vizCatAmt: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  vizCatPercent: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, marginLeft: 8 },
  noDataText: { fontFamily: 'Inter_500Medium', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },

  catBudgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  catBudgetCard: { width: '48.5%', padding: 12, borderRadius: 16, borderWidth: 1 },
  catCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  catIconBox: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  catIconBoxDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  catCardName: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase', flex: 1 },
  compactPercent: { fontFamily: 'Inter_800ExtraBold', fontSize: 10 },
  compactMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  catRemainingCompact: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },
  compactStatusLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, opacity: 0.8 },
  progressBarBgCompact: { height: 3, borderRadius: 1.5, overflow: 'hidden' },
  progressBarFillCompact: { height: '100%', borderRadius: 1.5 },

  expensesList: { gap: 12 },
  listCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  listCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  airlineGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  expenseName: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  expenseCat: { fontFamily: 'Inter_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  listRight: { alignItems: 'flex-end', minWidth: 100, flexShrink: 0 },
  listAmount: { fontFamily: 'Outfit_400Regular', fontSize: 18, textAlign: 'right' },
  listDate: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
});