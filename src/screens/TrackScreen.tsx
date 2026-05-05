import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform, ScrollView, Keyboard, Dimensions, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useLedgr } from '../lib/LedgrContext';
import { useThemeColors } from '../lib/ThemeContext';
import { ExpenseCategory, Expense, autoCategorize } from '../lib/store';
import { Coffee, Car, Home as HomeIcon, ShoppingBag, Heart, MoreHorizontal, Plus, ShoppingBasket, Calendar, Pencil, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSnackbar } from '../components/Snackbar';
import EditExpenseModal from '../components/EditExpenseModal';
import { getDaysRemainingInMonth, isToday } from '../lib/dateUtils';
import GroceryListsView from '../components/grocery/GroceryListsView';

const CATEGORY_ICONS: Record<ExpenseCategory, any> = {
  Food: Coffee,
  Transport: Car,
  Bills: HomeIcon,
  Shopping: ShoppingBag,
  Grocery: ShoppingBasket,
  Health: Heart,
  Other: MoreHorizontal,
};

export default function TrackScreen() {
  const { expenses, budget, addExpense, isLoaded, allCategories } = useLedgr();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const [mode, setMode] = useState<'expense' | 'grocery'>('expense');
  const [desc, setDesc] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const catScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewWidth, setViewWidth] = useState(0);
  const [toggleWidth, setToggleWidth] = useState(0);
  const [categoryLayouts, setCategoryLayouts] = useState<Record<string, { x: number, width: number }>>({});
  const toggleAnim = useRef(new Animated.Value(mode === 'expense' ? 0 : 1)).current;
  const SCREEN_WIDTH = Dimensions.get('window').width;

  const isAtStart = scrollX <= 5;
  const isAtEnd = scrollX >= (contentWidth - viewWidth - 5);

  const MOTIVATIONAL_PROMPT = useMemo(() => {
    const prompts = [
      "Let's see where the money went 👀",
      "You showed up. That already counts.",
      "Quick log. Clear mind. Let's go.",
      "Your wallet called. It needs you.",
      "Don't let today's expenses become tomorrow's mystery.",
      "A minute now saves stress later.",
      "You're doing better than you think. Keep logging.",
      "New day, fresh start. Let's track it.",
      "Got something to add? Let's do it.",
      "The best time to log was earlier. Second best? Right now."
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, []);

  const activeMonth = budget.budgetMonth || format(new Date(), 'yyyy-MM');

  const prevMonthStr = useMemo(() => {
    const [year, month] = activeMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [activeMonth]);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => format(new Date(e.date), 'yyyy-MM') === activeMonth);
  }, [expenses, activeMonth]);

  const thisMonthSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const lastMonthSpent = useMemo(() => {
    return expenses
      .filter(e => format(new Date(e.date), 'yyyy-MM') === prevMonthStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, prevMonthStr]);

  const budgetUsage = budget.total > 0 ? (thisMonthSpent / budget.total) : 0;
  const isOverBudget = thisMonthSpent > budget.total;

  let insight = "First month tracking!";
  let insightColor = colors.accent;
  let InsightIcon = TrendingUp;

  if (lastMonthSpent > 0) {
    const diff = ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100;
    insight = `${Math.abs(Math.round(diff))}% ${diff > 0 ? 'more' : 'less'} than last month`;
    insightColor = diff > 0 ? colors.danger : colors.success;
    InsightIcon = diff > 0 ? TrendingUp : TrendingDown;
  }

  const todaySpent = expenses
    .filter(e => {
      const d = new Date(e.date);
      const today = new Date();
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const daysLeft = getDaysRemainingInMonth();

  const amountRef = useRef<TextInput>(null);

  const handleAdd = () => {
    if (!desc || !amountStr) return;
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) return;

    addExpense({
      name: desc,
      amount: amt,
      category: selectedCategory || autoCategorize(desc),
      date: format(expenseDate, "yyyy-MM-dd'T'HH:mm:ss")
    });
    setDesc('');
    setAmountStr('');
    setSelectedCategory(null);
    setExpenseDate(new Date());
    showSnackbar('Expense added!', 'success');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setExpenseDate(selectedDate);
  };

  const handleEditPress = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditModalVisible(true);
  };

  const getCategoryStatus = (cat: ExpenseCategory) => {
    const limit = budget.categories[cat] || 0;
    const spent = currentMonthExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    const remaining = limit - spent;
    return { spent, limit, remaining, isOver: spent > limit };
  };

  const handleModeSwitch = (newMode: 'expense' | 'grocery') => {
    setMode(newMode);
    Animated.spring(toggleAnim, {
      toValue: newMode === 'expense' ? 0 : 1,
      useNativeDriver: true,
      bounciness: 4,
      speed: 12
    }).start();
    horizontalScrollRef.current?.scrollTo({ x: newMode === 'expense' ? 0 : SCREEN_WIDTH, animated: true });
  };

  const onHorizontalScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / SCREEN_WIDTH);
    const newMode = newIdx === 0 ? 'expense' : 'grocery';
    if (newMode !== mode) {
      setMode(newMode);
      Animated.spring(toggleAnim, {
        toValue: newMode === 'expense' ? 0 : 1,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12
      }).start();
    }
  };

  const handleCategoryPress = (cat: ExpenseCategory) => {
    setSelectedCategory(cat);
    const layout = categoryLayouts[cat];
    if (layout && viewWidth > 0) {
      const targetX = layout.x - (viewWidth / 2) + (layout.width / 2);
      catScrollRef.current?.scrollTo({ x: Math.max(0, targetX), animated: true });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Glow effects only visible in dark mode — they're rgba so they fade naturally */}
      <View style={[styles.glow, { bottom: -100, left: -50, backgroundColor: 'rgba(0, 240, 255, 0.08)' }]} />
      <View style={[styles.glow, { bottom: -100, right: -50, backgroundColor: 'rgba(138, 43, 226, 0.08)' }]} />


        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTopLeft}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoSmall}
                resizeMode="contain"
              />
              <Text style={[styles.brandNameSmall, { color: colors.textTertiary }]}>LEDGR</Text>
            </View>
            <Text style={[styles.headerTitleSmall, { color: colors.textPrimary }]}>Track</Text>
          </View>

          {/* Mode Toggle */}
          <View 
            style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}
            onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width - 8)} // padding is 4 on each side
          >
            {toggleWidth > 0 && (
              <Animated.View 
                style={[
                  styles.modeActivePill, 
                  { 
                    backgroundColor: colors.accent,
                    width: toggleWidth / 2,
                    transform: [{ 
                      translateX: toggleAnim.interpolate({ 
                        inputRange: [0, 1], 
                        outputRange: [0, toggleWidth / 2] 
                      }) 
                    }]
                  }
                ]} 
              />
            )}
            <TouchableOpacity
              style={styles.modeBtn}
              onPress={() => handleModeSwitch('expense')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, { color: mode === 'expense' ? colors.background : colors.textTertiary }]}>Track Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modeBtn}
              onPress={() => handleModeSwitch('grocery')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, { color: mode === 'grocery' ? colors.background : colors.textTertiary }]}>Grocery Lists</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onHorizontalScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TRACK EXPENSE PAGE */}
          <KeyboardAwareScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            extraScrollHeight={120}
            enableOnAndroid={true}
            keyboardOpeningTime={0}
          >
          <View style={styles.bannerRow}>
            <View style={[styles.bannerHighlight, { backgroundColor: colors.accent }]} />
            <Sparkles size={14} color={colors.accent} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={[styles.subtitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {MOTIVATIONAL_PROMPT}
            </Text>
          </View>

          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={[styles.summaryCard, { borderColor: colors.cardBorder }]}
          >
            <View style={styles.summaryRow}>
              <View>
                <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>SPENT THIS MONTH</Text>
                <View style={styles.summaryAmountRow}>
                  <Text style={[styles.summaryCurrency, { color: colors.textTertiary }]}>PKR</Text>
                  <Text style={[styles.summaryAmount, { color: colors.textPrimary }]}>{thisMonthSpent.toLocaleString()}</Text>
                </View>
              </View>
              <View style={[styles.insightPill, { backgroundColor: `${insightColor}15` }]}>
                <InsightIcon color={insightColor} size={12} style={{ marginRight: 4 }} />
                <Text style={[styles.insightText, { color: insightColor }]}>{insight}</Text>
              </View>
            </View>

            <View style={styles.usageContainer}>
              <View style={styles.usageHeader}>
                <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Budget Usage</Text>
                <Text style={[styles.usagePercent, { color: colors.accent }, isOverBudget && { color: colors.danger }]}>
                  {Math.round(budgetUsage * 100)}%
                </Text>
              </View>
              <View style={[styles.usageBarBg, { backgroundColor: colors.divider }]}>
                <View style={[
                  styles.usageBarFill,
                  { width: `${Math.min(100, budgetUsage * 100)}%`, backgroundColor: colors.accent },
                  isOverBudget && { backgroundColor: colors.danger }
                ]} />
              </View>
            </View>
          </LinearGradient>


        <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginTop: 12 }]}>
          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Pencil color={colors.iconMuted} size={18} style={{ marginRight: 12 }} />
            <TextInput
              style={[styles.inputDesc, { color: colors.textPrimary }]}
              placeholder="Description (e.g. Lunch)"
              placeholderTextColor={colors.textMuted}
              value={desc}
              onChangeText={setDesc}
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Text style={[styles.currencyPrefix, { color: colors.accent }]}>PKR</Text>
            <TextInput
              ref={amountRef}
              style={[styles.inputAmount, { color: colors.textPrimary }]}
              placeholder="0.0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
              onBlur={() => {
                if (amountStr.trim() && parseFloat(amountStr) === 0) setAmountStr('');
              }}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              blurOnSubmit={true}
            />
          </View>

          <TouchableOpacity style={[styles.dateSelector, { backgroundColor: colors.pillBg, borderColor: colors.inputBorder }]} onPress={() => setShowDatePicker(true)}>
            <View style={styles.dateContent}>
              <Calendar size={18} color={colors.accent} />
              <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                {expenseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={[styles.dateLabelBox, { backgroundColor: colors.accentBg }]}>
              <Text style={[styles.dateLabelText, { color: colors.accent }]}>{expenseDate.toDateString() === new Date().toDateString() ? 'TODAY' : 'CUSTOM DATE'}</Text>
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Category</Text>
          </View>

          <View style={styles.catScrollRow}>
            <View style={styles.navIconContainer}>
              {!isAtStart && (
                <TouchableOpacity onPress={() => catScrollRef.current?.scrollTo({ x: 0, animated: true })}>
                  <ChevronLeft color={colors.accent} size={20} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              ref={catScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catScrollContent}
              onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
              scrollEventThrottle={16}
              onContentSizeChange={(w) => setContentWidth(w)}
              onLayout={(e) => setViewWidth(e.nativeEvent.layout.width)}
              onTouchStart={() => horizontalScrollRef.current?.setNativeProps({ scrollEnabled: false })}
              onTouchEnd={() => horizontalScrollRef.current?.setNativeProps({ scrollEnabled: true })}
              onTouchCancel={() => horizontalScrollRef.current?.setNativeProps({ scrollEnabled: true })}
            >
              <View style={styles.catRow}>
                {allCategories.map(cat => {
                  const Icon = CATEGORY_ICONS[cat] || MoreHorizontal;
                  const isSelected = selectedCategory === cat;
                  const { remaining, isOver } = getCategoryStatus(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      onLayout={(e) => {
                        const { x, width } = e.nativeEvent.layout;
                        setCategoryLayouts(prev => ({ ...prev, [cat]: { x, width } }));
                      }}
                      style={[
                        styles.miniCatPill,
                        { backgroundColor: colors.pillBg, borderColor: colors.inputBorder },
                        isSelected && { backgroundColor: colors.saveBtnBg, borderColor: colors.saveBtnBg }
                      ]}
                      onPress={() => handleCategoryPress(cat)}
                    >
                      <Icon color={isSelected ? colors.saveBtnText : colors.iconMuted} size={14} />
                      <View>
                        <Text style={[styles.miniCatText, { color: colors.textSecondary }, isSelected && { color: colors.saveBtnText, fontFamily: 'Inter_700Bold' }]}>{cat}</Text>
                        <Text style={[styles.miniCatSubtext, { color: colors.textTertiary }, isOver && { color: colors.danger }, isSelected && { color: `${colors.saveBtnText}99` }]}>
                          PKR {remaining.toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.navIconContainer}>
              {!isAtEnd && (
                <TouchableOpacity onPress={() => catScrollRef.current?.scrollToEnd({ animated: true })}>
                  <ChevronRight color={colors.accent} size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bigAddButton, { backgroundColor: colors.saveBtnBg }, (!desc || !amountStr) && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!desc || !amountStr}
          >
            <Text style={[styles.addBtnLabel, { color: colors.saveBtnText }]}>Add Expense</Text>
            <Plus color={colors.saveBtnText} size={20} strokeWidth={3} />
          </TouchableOpacity>

          {expenses.length > 0 && (() => {
            // Find the most recently CREATED expense (not by transaction date)
            const exp = [...expenses].sort((a, b) => {
              const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              // If both lack createdAt (legacy data), fall back to array position (id encodes timestamp)
              if (aTime === 0 && bTime === 0) return 0;
              return bTime - aTime;
            })[0];
            const expDesc = exp.name.replace(/^Paid:\s*/i, '');
            return (
              <TouchableOpacity onPress={() => handleEditPress(exp)}>
                <View style={[styles.latestChipRow, { backgroundColor: colors.accentBg, borderColor: `${colors.accent}30` }]}>
                  <Text style={[styles.latestChipLabel, { color: colors.textTertiary }]}>LAST ADDED</Text>
                  <View style={[styles.latestChipCat, { backgroundColor: colors.accentBg }]}>
                    <Text style={[styles.latestChipCatText, { color: colors.accent }]}>{exp.category.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.latestChipDesc, { color: colors.textSecondary }]} numberOfLines={1}>{expDesc}</Text>
                  <Text style={[styles.latestChipAmount, { color: colors.accent }]}>PKR {exp.amount.toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {expenses.length > 0 && (
            <View style={[styles.quickStatsStrip, { backgroundColor: colors.pillBg, borderColor: colors.divider }]}>
              <Text style={styles.quickStatText}>
                <Text style={[styles.quickStatLabel, { color: colors.textTertiary }]}>Today: </Text>
                <Text style={[styles.quickStatValue, { color: colors.accent }]}>PKR {todaySpent.toLocaleString()}</Text>
                <Text style={[styles.quickStatDivider, { color: colors.textMuted }]}>  •  </Text>
                <Text style={[styles.quickStatValue, { color: colors.accent }]}>{daysLeft} </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textTertiary }]}>days left</Text>
              </Text>
            </View>
          )}

        </View>
        </KeyboardAwareScrollView>

        {/* GROCERY LISTS PAGE */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <GroceryListsView />
        </View>
      </ScrollView>

      <EditExpenseModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        expense={editingExpense}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 0 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, width: '100%' },
  headerTopLeft: { flexDirection: 'row', alignItems: 'center' },
  headerDivider: { width: 1, height: 12, marginHorizontal: 12, opacity: 0.3 },
  headerTitleSmall: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 },
  logoSmall: { width: 18, height: 18, marginRight: 10 },
  brandNameSmall: { fontFamily: 'Outfit_800ExtraBold', fontSize: 10, letterSpacing: 2 },
  bannerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 12, marginTop: 8, position: 'relative' },
  bannerHighlight: { position: 'absolute', left: 0, top: 2, bottom: 2, width: 3, borderRadius: 2, opacity: 0.6 },
  subtitle: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 18, flex: 1 },

  summaryCard: { borderRadius: 20, padding: 14, borderWidth: 1, marginTop: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  summaryLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  summaryAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  summaryCurrency: { fontSize: 12, fontFamily: 'Outfit_400Regular' },
  summaryAmount: { fontSize: 22, fontFamily: 'Outfit_600SemiBold' },
  insightPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  insightText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  usageContainer: { marginTop: 4 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  usageLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  usagePercent: { fontSize: 11, fontFamily: 'Outfit_700Bold' },
  usageBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  usageBarFill: { height: '100%', borderRadius: 2 },

  inputCard: { borderRadius: 28, padding: 16, borderWidth: 1, marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 50, paddingHorizontal: 16, marginBottom: 8, borderWidth: 1 },
  inputDesc: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 16, padding: 0 },
  currencyPrefix: { fontFamily: 'Inter_700Bold', fontSize: 12, marginRight: 12 },
  inputAmount: { flex: 1, fontFamily: 'Outfit_600SemiBold', fontSize: 20, padding: 0 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginTop: 4 },
  catScrollRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -16, paddingHorizontal: 4 },
  navIconContainer: { width: 32, alignItems: 'center', justifyContent: 'center' },
  catScroll: { flex: 1 },
  catScrollContent: { paddingHorizontal: 8 },
  catRow: { flexDirection: 'row', gap: 8 },
  miniCatPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderWidth: 1 },
  miniCatText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  miniCatSubtext: { fontSize: 9, fontFamily: 'Inter_700Bold' },

  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, height: 50, paddingHorizontal: 16, marginBottom: 6, borderWidth: 1 },
  dateContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  dateLabelBox: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dateLabelText: { fontSize: 8, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5 },

  bigAddButton: { borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  addBtnLabel: { fontFamily: 'Outfit_800ExtraBold', fontSize: 16 },
  addButtonDisabled: { opacity: 0.3 },

  latestChipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  latestChipLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, marginRight: 8 },
  latestChipCat: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  latestChipCatText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  latestChipDesc: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, marginRight: 8 },
  latestChipAmount: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },

  quickStatsStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickStatText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  quickStatLabel: {},
  quickStatValue: { fontFamily: 'Inter_700Bold' },
  quickStatDivider: { marginHorizontal: 8 },
  modeToggle: { 
    flexDirection: 'row', 
    borderRadius: 16, 
    borderWidth: 1, 
    padding: 4, 
    marginTop: 4, 
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  modeBtn: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  modeBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 13 },
  modeActivePill: { position: 'absolute', top: 4, left: 4, height: 42, borderRadius: 12, zIndex: 0 },
});