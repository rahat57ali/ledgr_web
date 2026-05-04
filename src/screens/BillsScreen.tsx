import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Keyboard, Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard, Plus, Calendar as CalendarIcon, Clock, AlertCircle, RefreshCw,
  Trash2, Check, X, Music, Tv, Zap, Flame, Globe, Home as HomeIcon
} from 'lucide-react-native';
import { useLedgr } from '../lib/LedgrContext';
import { useThemeColors } from '../lib/ThemeContext';
import { Bill, autoCategorize } from '../lib/store';
import { format, differenceInDays, addDays, isBefore, startOfDay } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSnackbar } from '../components/Snackbar';
import BillPaymentModal from '../components/BillPaymentModal';

const SUGGESTIONS = [
  { name: 'Electricity', icon: Zap, color: '#F59E0B' },
  { name: 'Gas', icon: Flame, color: '#F97316' },
  { name: 'Internet', icon: Globe, color: '#00F0FF' },
  { name: 'Rent', icon: HomeIcon, color: '#8A2BE2' },
  { name: 'Subscription', icon: CreditCard, color: '#FF007F' },
];

export default function BillsScreen() {
  const { bills, addBill, updateBill, deleteBill, addExpense } = useLedgr();
  const { showSnackbar } = useSnackbar();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const amountInputRef = useRef<TextInput>(null);

  const handleAddBill = async () => {
    if (!name || !amount) {
      showSnackbar('Please enter name and amount', 'error');
      return;
    }
    await addBill({ name, amount: parseFloat(amount), dueDate: format(date, "yyyy-MM-dd'T'HH:mm:ss"), category: 'Bills', isPaid: false });
    setName(''); setAmount(''); setDate(new Date()); setIsModalVisible(false);
    showSnackbar('Bill added successfully');
  };

  const handlePayBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsPayModalVisible(true);
  };

  const handleConfirmPayment = async (amount: number) => {
    if (!selectedBill) return;
    await addExpense({ name: `Paid: ${selectedBill.name}`, amount, category: 'Bills', date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss") });
    const nextDueDate = addDays(new Date(selectedBill.dueDate), 30);
    await updateBill({ ...selectedBill, dueDate: format(nextDueDate, "yyyy-MM-dd'T'HH:mm:ss"), isPaid: false });
    setIsPayModalVisible(false);
    showSnackbar(`Paid ${selectedBill.name} - PKR ${amount.toLocaleString()}`);
  };

  const getBillStatus = (dueDateStr: string) => {
    const today = startOfDay(new Date());
    const dueDate = startOfDay(new Date(dueDateStr));
    const diff = differenceInDays(dueDate, today);
    if (diff < 0) return { label: `Overdue by ${Math.abs(diff)}d`, color: '#EF4444', level: 'overdue' };
    if (diff === 0) return { label: 'Due Today', color: '#F97316', level: 'urgent' };
    if (diff <= 3) return { label: `Due in ${diff}d`, color: '#FBBF24', level: 'warning' };
    return { label: `Due in ${diff}d`, color: colors.textMuted, level: 'normal' };
  };

  const getBillIcon = (name: string) => {
    const suggestion = SUGGESTIONS.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (suggestion) return suggestion.icon;
    const lower = name.toLowerCase();
    if (lower.includes('electric') || lower.includes('light') || lower.includes('wapda')) return Zap;
    if (lower.includes('gas')) return Flame;
    if (lower.includes('internet') || lower.includes('wifi') || lower.includes('ptcl')) return Globe;
    if (lower.includes('rent') || lower.includes('house')) return HomeIcon;
    if (lower.includes('spotify') || lower.includes('music')) return Music;
    if (lower.includes('netflix') || lower.includes('tv') || lower.includes('youtube')) return Tv;
    return CreditCard;
  };

  const totalCommitted = useMemo(() => bills.reduce((sum, b) => sum + b.amount, 0), [bills]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTopLeft}>
              <Image source={require('../../assets/logo.png')} style={styles.logoSmall} resizeMode="contain" />
              <Text style={[styles.brandNameSmall, { color: colors.textTertiary }]}>LEDGR</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.headerTitleSmall, { color: colors.textPrimary }]}>Bills</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryCardContainer}>
          <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={[styles.summaryCard, { borderColor: colors.cardBorder }]}>
            <View style={styles.summaryCardRow}>
              <View>
                <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>COMMITTED THIS MONTH</Text>
                <Text style={[styles.summaryCardValue, { color: colors.textPrimary }]}>PKR {totalCommitted.toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryIconBox, { backgroundColor: `${colors.purple}15` }]}>
                <CreditCard color={colors.purple} size={24} />
              </View>
            </View>
            <View style={[styles.summaryProgressBg, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <View style={[styles.summaryProgressFill, { width: '100%', backgroundColor: colors.purple }]} />
            </View>
          </LinearGradient>
        </View>
        <TouchableOpacity activeOpacity={1} onPress={() => setDeletingBillId(null)} style={{ flex: 1 }}>
          {bills.length === 0 ? (
            <View style={styles.emptyState}>
              <CreditCard color={colors.divider} size={80} style={{ marginBottom: 20 }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No bills yet</Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>Add your recurring subscriptions or utility bills to stay on track.</Text>
            </View>
          ) : (
            <View style={styles.billsList}>
              {bills.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(bill => {
                const status = getBillStatus(bill.dueDate);
                const BillIcon = getBillIcon(bill.name);
                const isUrgent = status.level !== 'normal';

                return (
                  <LinearGradient
                    key={bill.id}
                    colors={isUrgent ? [`${status.color}10`, colors.gradientEnd] as const : [colors.gradientStart, colors.gradientEnd] as const}
                    style={[styles.billCard, { borderColor: status.level === 'overdue' ? `${status.color}40` : colors.cardBorderSubtle }]}
                  >
                    <View style={styles.billRow}>
                      <View style={styles.billMain}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.pillBg, borderColor: isUrgent ? `${status.color}30` : colors.cardBorderSubtle }]}>
                          <BillIcon color={isUrgent ? status.color : colors.accent} size={18} />
                        </View>
                        <View>
                          <Text style={[styles.billName, { color: colors.textPrimary }]}>{bill.name}</Text>
                          <Text style={[styles.billStatus, { color: status.color }]}>{status.label}</Text>
                        </View>
                      </View>
                      <View style={styles.billAmountContainer}>
                        <Text style={[styles.billAmount, { color: colors.textPrimary }]}>PKR {bill.amount.toLocaleString()}</Text>
                        <Text style={[styles.billDate, { color: colors.textSecondary }]}>{format(new Date(bill.dueDate), 'MMM dd')}</Text>
                      </View>
                    </View>

                    <View style={[styles.cardActions, { borderTopColor: colors.divider }]}>
                      <TouchableOpacity
                        style={[styles.payBtn, { backgroundColor: isUrgent ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: colors.divider }, !isUrgent && styles.payBtnSubtle]}
                        onPress={() => handlePayBill(bill)}
                      >
                        <RefreshCw color={isUrgent ? colors.textPrimary : colors.textMuted} size={12} style={{ marginRight: 6 }} />
                        <Text style={[styles.payBtnText, { color: isUrgent ? colors.textPrimary : colors.textMuted }]}>Paid & Renew</Text>
                      </TouchableOpacity>

                      <View style={styles.actionRight}>
                        {deletingBillId === bill.id ? (
                          <View style={styles.confirmDeleteContainer}>
                            <TouchableOpacity style={[styles.miniActionBtn, styles.confirmAction]} onPress={() => { deleteBill(bill.id); setDeletingBillId(null); }}>
                              <Check color="#FFFFFF" size={12} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.miniActionBtn, styles.cancelAction]} onPress={() => setDeletingBillId(null)}>
                              <X color="#FFFFFF" size={12} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeletingBillId(bill.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Trash2 color={colors.textMuted} size={16} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                );
              })}
            </View>
          )}

          <View style={styles.suggestionsHeader}>
            <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Quick Add</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s.name} style={[styles.suggestionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]} onPress={() => { setName(s.name); setIsModalVisible(true); }}>
                <View style={[styles.suggestionIcon, { backgroundColor: `${s.color}20` }]}>
                  <s.icon color={s.color} size={20} />
                </View>
                <Text style={[styles.suggestionName, { color: colors.textTertiary }]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[colors.modalGradientStart, colors.modalGradientEnd]} style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Recurring Bill</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.closeBtnBg }]}>
                  <Text style={{ color: colors.textTertiary }}>Close</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>BILL NAME</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]} 
                  value={name} 
                  onChangeText={setName} 
                  placeholder="e.g. Netflix" 
                  placeholderTextColor={colors.textMuted} 
                  returnKeyType="next"
                  onSubmitEditing={() => amountInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>AMOUNT (PKR)</Text>
                <TextInput 
                  ref={amountInputRef}
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder }]} 
                  value={amount} 
                  onChangeText={setAmount}
                  onBlur={() => {
                    if (!amount.trim()) setAmount('');
                  }}
                  keyboardType="numeric" 
                  placeholder="0.0" 
                  placeholderTextColor={colors.textMuted} 
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>NEXT DUE DATE</Text>
                <TouchableOpacity style={[styles.dateSelector, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} onPress={() => setShowDatePicker(true)}>
                  <CalendarIcon color={colors.accent} size={18} style={{ marginRight: 10 }} />
                  <Text style={[styles.dateText, { color: colors.textPrimary }]}>{format(date, 'MMMM dd, yyyy')}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker value={date} mode="date" display="default" onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) setDate(selectedDate); }} />
              )}

              <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.saveBtnBg }]} onPress={handleAddBill}>
                <Text style={[styles.saveButtonText, { color: colors.saveBtnText }]}>Add Bill</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <BillPaymentModal
        visible={isPayModalVisible}
        bill={selectedBill}
        onClose={() => setIsPayModalVisible(false)}
        onConfirm={handleConfirmPayment}
      />
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.purple, shadowColor: colors.purple, bottom: 20 }]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus color="#FFFFFF" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  header: { marginBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTopLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerDivider: { width: 1, height: 12, marginHorizontal: 12, opacity: 0.3 },
  headerTitleSmall: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 },
  logoSmall: { width: 18, height: 18, marginRight: 10 },
  brandNameSmall: { fontFamily: 'Outfit_800ExtraBold', fontSize: 10, letterSpacing: 2 },
  
  summaryCardContainer: { paddingHorizontal: 20, marginBottom: 20 },
  summaryCard: { padding: 20, borderRadius: 24, borderWidth: 1 },
  summaryCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryCardLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 4 },
  summaryCardValue: { fontSize: 26, fontFamily: 'Outfit_600SemiBold' },
  summaryIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryProgressBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  summaryProgressFill: { height: '100%', borderRadius: 2 },

  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 100, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  subtitle: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 4 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
  emptySub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },

  billsList: { gap: 12 },
  billCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  billName: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  billStatus: { fontSize: 10, fontFamily: 'Inter_700Bold', marginTop: 2, letterSpacing: 0.5 },
  billAmountContainer: { alignItems: 'flex-end' },
  billAmount: { fontSize: 22, fontFamily: 'Outfit_300Light' },
  billDate: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },

  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  payBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  payBtnSubtle: { borderWidth: 1 },
  payBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  deleteBtn: { padding: 4, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  actionRight: { width: 62, alignItems: 'flex-end', justifyContent: 'center' },
  confirmDeleteContainer: { flexDirection: 'row', gap: 6 },
  miniActionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  confirmAction: { backgroundColor: '#10B981' },
  cancelAction: { backgroundColor: '#EF4444' },

  suggestionsHeader: { marginTop: 32, marginBottom: 12 },
  suggestionsTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  suggestionsScroll: { gap: 10 },
  suggestionCard: { width: 90, padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  suggestionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  suggestionName: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { height: '75%' },
  modalInner: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 24, fontFamily: 'Outfit_800ExtraBold' },
  closeBtn: { padding: 8, borderRadius: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, marginBottom: 8 },
  input: { height: 50, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter_500Medium', borderWidth: 1 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1 },
  dateText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  saveButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveButtonText: { fontSize: 16, fontFamily: 'Outfit_800ExtraBold' }
});