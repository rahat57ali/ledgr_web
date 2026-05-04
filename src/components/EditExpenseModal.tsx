import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Platform,
  ScrollView,
  Keyboard
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  Trash2, 
  Calendar as CalendarIcon, 
  Coffee, 
  Car, 
  Home as HomeIcon, 
  ShoppingBag, 
  Heart, 
  MoreHorizontal, 
  ShoppingBasket,
  Check
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLedgr } from '../lib/LedgrContext';
import { Expense, ExpenseCategory } from '../lib/store';
import { format } from 'date-fns';
import { useSnackbar } from './Snackbar';
import { useThemeColors } from '../lib/ThemeContext';

interface EditExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  expense: Expense | null;
}

const CATEGORY_ICONS: Record<ExpenseCategory, any> = {
  Food: Coffee,
  Transport: Car,
  Bills: HomeIcon,
  Shopping: ShoppingBag,
  Grocery: ShoppingBasket,
  Health: Heart,
  Other: MoreHorizontal,
};

export default function EditExpenseModal({ visible, onClose, expense }: EditExpenseModalProps) {
  const { updateExpense, deleteExpense, allCategories } = useLedgr();
  const { showSnackbar } = useSnackbar();
  const colors = useThemeColors();
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Other');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDate(new Date(expense.date));
      setShowDeleteConfirm(false);
    }
  }, [expense, visible]);

  const handleUpdate = async () => {
    if (!expense || !name || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    await updateExpense({
      ...expense,
      name,
      amount: amt,
      category,
      date: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
    });

    showSnackbar('Expense updated successfully!', 'success');
    onClose();
  };

  const handleDelete = async () => {
    if (!expense) return;
    await deleteExpense(expense.id);
    showSnackbar('Expense removed.', 'success');
    onClose();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  if (!expense) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.modalGradientStart, colors.modalGradientEnd] as const}
            style={[styles.modalContent, { borderColor: colors.cardBorder }]}
          >
            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              extraScrollHeight={120}
              enableOnAndroid={true}
              keyboardOpeningTime={0}
              style={{ flexShrink: 1 }}
            >
              <View style={styles.header}>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Transaction</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.closeBtnBg }]}>
                  <X color={colors.textSecondary} size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>DESCRIPTION</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, padding: 0 }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="E.g. Starbucks Coffee"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  onSubmitEditing={() => amountRef.current?.focus()}
                />
              </View>

              <Text style={[styles.label, { color: colors.textTertiary }]}>AMOUNT (PKR)</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput
                  ref={amountRef}
                  style={[styles.inputAmount, { color: colors.textPrimary, padding: 0 }]}
                  value={amount}
                  onChangeText={setAmount}
                  onBlur={() => {
                    if (!amount.trim()) setAmount('');
                  }}
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <Text style={[styles.label, { color: colors.textTertiary }]}>TRANSACTION DATE</Text>
              <TouchableOpacity 
                style={[styles.dateSelector, { backgroundColor: colors.accentBg, borderColor: colors.accentMuted + '40' }]} 
                onPress={() => setShowDatePicker(true)}
              >
                <CalendarIcon color={colors.accent} size={16} />
                <Text style={[styles.dateText, { color: colors.textPrimary }]}>{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              <Text style={[styles.label, { color: colors.textTertiary }]}>CATEGORY</Text>
              <View style={styles.catGrid}>
                {(allCategories.includes(category) ? allCategories : [category, ...allCategories]).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat as ExpenseCategory] || MoreHorizontal;
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill, 
                        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                        isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Icon color={isSelected ? colors.background : colors.textTertiary} size={13} />
                      <Text style={[styles.catPillText, { color: colors.textSecondary }, isSelected && { color: colors.background, fontWeight: 'bold' }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </KeyboardAwareScrollView>

            {/* Fixed bottom actions — always visible */}
            <View style={styles.actions}>
              {!showDeleteConfirm ? (
                <>
                  <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger + '40' }]} onPress={() => setShowDeleteConfirm(true)}>
                    <Trash2 color={colors.danger} size={18} />
                    <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.saveBtnBg }]} onPress={handleUpdate}>
                    <Text style={[styles.saveText, { color: colors.saveBtnText }]}>Save Changes</Text>
                    <Check color={colors.saveBtnText} size={18} strokeWidth={3} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.danger, borderColor: colors.danger }]} onPress={handleDelete}>
                    <Check color="#FFFFFF" size={18} strokeWidth={3} />
                    <Text style={[styles.deleteText, { color: '#FFFFFF' }]}>Confirm</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.closeBtnBg, borderWidth: 1, borderColor: colors.cardBorder }]} onPress={() => setShowDeleteConfirm(false)}>
                    <Text style={[styles.saveText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { width: '100%' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 16, paddingBottom: 20, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontFamily: 'Outfit_800ExtraBold', fontSize: 22 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  
  form: { gap: 6 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.5, marginBottom: 2 },
  inputRow: { borderRadius: 14, height: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1 },
  input: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  inputAmount: { fontFamily: 'Outfit_600SemiBold', fontSize: 18 },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  dateText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  catPillText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  
  actions: { flexDirection: 'row', gap: 12, marginTop: 14, paddingBottom: 10 },
  deleteBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  deleteText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15 },
  saveBtn: { flex: 2, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15 },
});