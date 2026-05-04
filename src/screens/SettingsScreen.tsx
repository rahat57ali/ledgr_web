import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Switch, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLedgr } from '../lib/LedgrContext';
import { useTheme, useThemeColors } from '../lib/ThemeContext';
import { ExpenseCategory, Budget, DEFAULT_CATEGORIES } from '../lib/store';
import { Coffee, Car, Home as HomeIcon, ShoppingBag, Heart, MoreHorizontal, ShoppingBasket, PlusCircle, Pencil, Trash2, Sun, Moon, Mic } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSnackbar } from '../components/Snackbar';
import DeleteCategoryModal from '../components/DeleteCategoryModal';
import { exportExpensesToXLSX, importExpensesFromFile } from '../lib/dateUtils';
import { Download, Upload, Share, HardDrive, Trash2 as TrashIcon } from 'lucide-react-native';
import CustomAlert from '../components/CustomAlert';
import { useGrocery } from '../lib/GroceryContext';
import { useVoiceMemos } from '../lib/VoiceMemoContext';
import { Alert } from 'react-native';

const CATEGORY_ICONS: Record<ExpenseCategory, any> = {
  Food: Coffee,
  Transport: Car,
  Bills: HomeIcon,
  Shopping: ShoppingBag,
  Grocery: ShoppingBasket,
  Health: Heart,
  Other: MoreHorizontal,
};

export default function SettingsScreen() {
  const { budget, updateBudget, isLoaded, expenses, allCategories, addCategory, deleteCategory, reloadBudgetState, showDevTools, importExpenses, simulateRollover } = useLedgr();
  const { showSnackbar } = useSnackbar();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { clearCompletedLists, getStorageSize: getGroceryStorage, lists: groceryLists } = useGrocery();
  const { clearAllMemos, getStorageSize: getVoiceStorage, memos } = useVoiceMemos();
  const [groceryStorageBytes, setGroceryStorageBytes] = useState(0);
  const [voiceStorageBytes, setVoiceStorageBytes] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchStorage = async () => {
      const gSize = await getGroceryStorage();
      const vSize = await getVoiceStorage();
      if (active) {
        setGroceryStorageBytes(gSize);
        setVoiceStorageBytes(vSize);
      }
    };
    fetchStorage();
    return () => { active = false; };
  }, [groceryLists, memos]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [alertVisible, setAlertVisible] = useState(false);
  const [voiceAlertVisible, setVoiceAlertVisible] = useState(false);

  const handleClearCompleted = () => {
    setAlertVisible(true);
  };

  const handleClearVoice = () => {
    setVoiceAlertVisible(true);
  };

  const [localBudget, setLocalBudget] = useState<Budget>(budget);
  const [totalStr, setTotalStr] = useState(budget.total.toString());
  const [catStrs, setCatStrs] = useState<Record<string, string>>({});
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const budgetRef = useRef<TextInput>(null);
  const categoryRefs = useRef<Record<string, TextInput | null>>({});

  useEffect(() => {
    if (isLoaded) {
      setLocalBudget(budget);
      setTotalStr(budget.total.toString());
      const strs: Record<string, string> = {};
      for (const cat of Object.keys(budget.categories)) {
        strs[cat] = (budget.categories[cat] || 0).toString();
      }
      setCatStrs(strs);
    }
  }, [budget, isLoaded]);

  const totalAllocated = useMemo(() =>
    Object.values(localBudget.categories).reduce((sum, val) => sum + val, 0),
    [localBudget.categories]);

  const unallocated = localBudget.total - totalAllocated;
  const isOverAllocated = unallocated < 0;

  const handleSaveBudget = () => {
    updateBudget(localBudget);
    showSnackbar('Budget configuration saved!', 'success');
  };

  const handleTotalChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setTotalStr(cleaned);
    setLocalBudget(prev => ({ ...prev, total: parseInt(cleaned) || 0 }));
  };

  const handleTotalBlur = () => {
    if (!totalStr.trim()) {
      setTotalStr('0');
      setLocalBudget(prev => ({ ...prev, total: 0 }));
    }
  };

  const handleCatChange = (cat: ExpenseCategory, val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setCatStrs(prev => ({ ...prev, [cat]: cleaned }));
    setLocalBudget(prev => ({ ...prev, categories: { ...prev.categories, [cat]: parseInt(cleaned) || 0 } }));
  };

  const handleCatBlur = (cat: string) => {
    if (!catStrs[cat]?.trim()) {
      setCatStrs(prev => ({ ...prev, [cat]: '0' }));
      setLocalBudget(prev => ({ ...prev, categories: { ...prev.categories, [cat]: 0 } }));
    }
  };

  const [isExporting, setIsExporting] = useState<false | 'download' | 'share'>(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async (action: 'download' | 'share') => {
    if (expenses.length === 0) { showSnackbar('No expenses to export', 'info'); return; }
    setIsExporting(action);
    const success = await exportExpensesToXLSX(expenses, action);
    setIsExporting(false);
    if (success) showSnackbar(`Data ${action === 'download' ? 'downloaded' : 'shared'} successfully`, 'success');
  };

  const handleImport = async () => {
    setIsImporting(true);
    const result = await importExpensesFromFile(expenses);
    setIsImporting(false);

    if (result) {
      if (result.imported > 0) {
        await importExpenses(result.expenses);
        let msg = `${result.imported} expenses imported.`;
        if (result.formatSkipped) msg += ` ${result.formatSkipped} formatting errors skipped.`;
        if (result.duplicateSkipped) msg += ` ${result.duplicateSkipped} duplicates skipped.`;
        showSnackbar(msg, 'success');
      } else if (result.formatSkipped > 0 || result.duplicateSkipped > 0) {
        let reasons = [];
        if (result.formatSkipped > 0) reasons.push(`${result.formatSkipped} rows had invalid formatting`);
        if (result.duplicateSkipped > 0) reasons.push(`${result.duplicateSkipped} rows were exact duplicates`);
        showSnackbar(`Import failed: ${reasons.join(' and ')}. No new entries added.`, 'error');
      } else {
        showSnackbar('Selected file was entirely empty or unreadable.', 'info');
      }
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
    setIsAddingCat(false);
    showSnackbar('Category added!', 'success');
  };

  const handleDeleteCategory = (cat: string) => {
    setCategoryToDelete(cat);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete;
    setIsDeleteModalVisible(false);
    setCategoryToDelete(null);
    await deleteCategory(catName);
    showSnackbar(`Category "${catName}" deleted`, 'success');
  };

  if (!isLoaded) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        extraScrollHeight={120}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        keyboardOpeningTime={0}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTopLeft}>
              <Image source={require('../../assets/logo.png')} style={styles.logoSmall} resizeMode="contain" />
              <Text style={[styles.brandNameSmall, { color: colors.textTertiary }]}>LEDGR</Text>
            </View>
            <Text style={[styles.headerTitleSmall, { color: colors.textPrimary }]}>Settings</Text>
          </View>
        </View>
        {/* Appearance Settings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
        </View>

        <View style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 16 }]}>
          <View style={styles.dataAction}>
            <View style={[styles.dataIconBox, { backgroundColor: isDark ? `${colors.purple}15` : `${colors.accent}15` }]}>
              {isDark ? <Moon color={colors.purple} size={20} /> : <Sun color={colors.accent} size={20} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: colors.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.dataActionSub, { color: colors.textTertiary }]}>
                {isDark ? 'Luminous interface active' : 'Sleek dark interface inactive'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.switchTrackFalse}
            />
          </View>
        </View>

        {/* Budget Configuration Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Budget Configuration</Text>
        </View>

        <View style={[styles.budgetMainCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.allocationHeader}>
            <Text style={[styles.allocationLabel, { color: colors.textTertiary }]}>TOTAL MONTHLY BUDGET</Text>
            <View style={[styles.allocationPill, isOverAllocated ? styles.pillDanger : styles.pillSuccess]}>
              <Text style={[styles.pillText, isOverAllocated ? styles.pillTextDanger : styles.pillTextSuccess]}>
                {isOverAllocated ? 'OVER-ALLOCATED' : 'ALLOCATED'}
              </Text>
            </View>
          </View>

          <View style={[styles.totalInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <View style={styles.totalInputRow}>
              <Text style={[styles.totalCurrency, { color: colors.accent }]}>PKR</Text>
              <TextInput
                ref={budgetRef}
                style={[styles.totalInput, { color: colors.textPrimary }]}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor={colors.textMuted}
                value={totalStr}
                onChangeText={handleTotalChange}
                onBlur={handleTotalBlur}
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (allCategories.length > 0) {
                    categoryRefs.current[allCategories[0]]?.focus();
                  }
                }}
              />
              <Pencil size={20} color={colors.accent} style={{ marginLeft: 12 }} />
            </View>
          </View>

          <View style={styles.allocationBarContainer}>
            <View style={[styles.allocationBarBg, { backgroundColor: colors.divider }]}>
              <View style={[styles.allocationBarFill, { width: `${Math.min(100, (totalAllocated / localBudget.total) * 100)}%`, backgroundColor: colors.purple }, isOverAllocated && styles.allocationBarFillDanger]} />
            </View>
            <View style={styles.allocationStats}>
              <Text style={[styles.statText, { color: colors.textTertiary }]}>Allocated: PKR {totalAllocated.toLocaleString()}</Text>
              <Text style={[styles.statValue, { color: colors.textSecondary }, isOverAllocated && { color: colors.danger }]}>
                {isOverAllocated ? `Exceeded by: PKR ${Math.abs(unallocated).toLocaleString()}` : `Remaining: PKR ${unallocated.toLocaleString()}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.catGridHeader}>
          <Text style={[styles.catSectionLabel, { color: colors.textTertiary }]}>CATEGORY ALLOCATION</Text>
          <TouchableOpacity style={[styles.addCatBtnSmall, { backgroundColor: colors.accentBg }]} onPress={() => setIsAddingCat(true)}>
            <PlusCircle size={14} color={colors.accent} />
            <Text style={[styles.addCatBtnTextSmall, { color: colors.accent }]}>NEW</Text>
          </TouchableOpacity>
        </View>

        {isAddingCat && (
          <View style={[styles.quickAddCat, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <TextInput
              style={[styles.quickAddInput, { color: colors.textPrimary }]}
              placeholder="Category Name"
              placeholderTextColor={colors.textMuted}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
            />
            <TouchableOpacity style={[styles.quickAddDone, { backgroundColor: colors.accent }]} onPress={handleAddCategory}>
              <Text style={[styles.quickAddDoneText, { color: colors.background }]}>ADD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAddCancel} onPress={() => setIsAddingCat(false)}>
              <Text style={[styles.quickAddCancelText, { color: colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.catBudgetGrid}>
          {allCategories.map((cat, index) => {
            const Icon = CATEGORY_ICONS[cat as ExpenseCategory] || MoreHorizontal;
            const amount = localBudget.categories[cat] || 0;
            const percentage = localBudget.total > 0 ? ((amount / localBudget.total) * 100).toFixed(1) : '0.0';

            return (
              <View key={cat} style={[styles.modernCatCard, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]}>
                <View style={styles.catCardHeader}>
                  <View style={[styles.catIconBox, { backgroundColor: colors.accentBg }]}>
                    <Icon color={colors.accent} size={14} />
                  </View>
                  <Text style={[styles.catName, { color: colors.textSecondary }]} numberOfLines={1}>{cat}</Text>

                  {!DEFAULT_CATEGORIES.includes(cat) && (
                    <TouchableOpacity style={styles.deleteCatBtn} onPress={() => handleDeleteCategory(cat)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Trash2 size={12} color={colors.danger} opacity={0.6} />
                    </TouchableOpacity>
                  )}

                  <Text style={[styles.catPercent, { color: colors.accent }]}>{percentage}%</Text>
                </View>
                <View style={[styles.catInputContainer, { backgroundColor: colors.innerCardBg }]}>
                  <Text style={[styles.catInputCurrency, { color: colors.textTertiary }]}>PKR</Text>
                  <TextInput
                    ref={el => { categoryRefs.current[cat] = el; }}
                    style={[styles.catInput, { color: colors.textPrimary }]}
                    keyboardType="numeric"
                    placeholder="0.0"
                    placeholderTextColor={colors.textMuted}
                    value={catStrs[cat] ?? amount.toString()}
                    onChangeText={(val) => handleCatChange(cat, val)}
                    onBlur={() => handleCatBlur(cat)}
                    returnKeyType={index === allCategories.length - 1 ? 'done' : 'next'}
                    onSubmitEditing={() => {
                      if (index < allCategories.length - 1) {
                        categoryRefs.current[allCategories[index + 1]]?.focus();
                      } else {
                        Keyboard.dismiss();
                      }
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.mainSaveButton, { backgroundColor: colors.saveBtnBg, opacity: (JSON.stringify(localBudget) !== JSON.stringify(budget)) ? 1 : 0.6 }]}
          onPress={handleSaveBudget}
          disabled={JSON.stringify(localBudget) === JSON.stringify(budget)}
        >
          <Text style={[styles.mainSaveText, { color: colors.saveBtnText }]}>Update Budget Configuration</Text>
        </TouchableOpacity>

        {/* Data Management */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data Management</Text>
        </View>

        <View style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }]}>
          <View style={[styles.dataAction, { paddingBottom: 12 }]}>
            <View style={[styles.dataIconBox, { backgroundColor: colors.accentBg }]}>
              <Download color={colors.accent} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: colors.textPrimary }]}>Export Data</Text>
              <Text style={[styles.dataActionSub, { color: colors.textTertiary, lineHeight: 16 }]}>Backup your transaction history as a standard .xlsx spreadsheet.</Text>
            </View>
          </View>

          <View style={styles.exportBtnRow}>
            <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]} onPress={() => handleExport('download')} disabled={isExporting !== false}>
              <Download size={14} color={colors.textPrimary} />
              <Text style={[styles.smallActionText, { color: colors.textPrimary }]}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle }]} onPress={() => handleExport('share')} disabled={isExporting !== false}>
              <Share size={14} color={colors.textPrimary} />
              <Text style={[styles.smallActionText, { color: colors.textPrimary }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.dataAction} onPress={handleImport} disabled={isImporting}>
            <View style={[styles.dataIconBox, { backgroundColor: colors.purpleBg }]}>
              <Upload color={colors.purple} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: colors.textPrimary }]}>Import from Excel / CSV</Text>
              <Text style={[styles.dataActionSub, { color: colors.textTertiary }]}>Append .xlsx or .csv records</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Grocery Data */}
        <View style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 12 }]}>
          <View style={[styles.dataAction, { paddingBottom: 12 }]}>
            <View style={[styles.dataIconBox, { backgroundColor: colors.accentBg }]}>
              <HardDrive color={colors.accent} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dataActionTitle, { color: colors.textPrimary }]}>Grocery & Voice Data</Text>
              <Text style={[styles.dataActionSub, { color: colors.textTertiary }]}>
                {formatBytes(groceryStorageBytes + voiceStorageBytes)} used · {groceryLists.filter(l => l.status === 'complete').length} completed lists · {memos.length} voice memos
              </Text>
            </View>
          </View>
          <View style={{ gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.smallActionBtn, { backgroundColor: colors.dangerBg, borderColor: `${colors.danger}30`, height: 44, justifyContent: 'center' }]}
              onPress={handleClearCompleted}
              disabled={groceryLists.filter(l => l.status === 'complete').length === 0}
            >
              <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.danger, opacity: groceryLists.filter(l => l.status === 'complete').length === 0 ? 0.4 : 1 }}>Clear All Completed Lists</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.smallActionBtn, { backgroundColor: colors.dangerBg, borderColor: `${colors.danger}30`, height: 44, justifyContent: 'center' }]}
              onPress={handleClearVoice}
              disabled={memos.length === 0}
            >
              <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.danger, opacity: memos.length === 0 ? 0.4 : 1 }}>Clear All Voice Memos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DEV TOOLS */}
        {showDevTools && (
          <View style={styles.devSection}>
            <Text style={styles.devHeader}>🛠 DEV TOOLS</Text>
            <TouchableOpacity style={styles.devBtn} onPress={async () => { await simulateRollover(); showSnackbar('Simulated Month Rollover', 'success'); }}>
              <Text style={styles.devBtnText}>Simulate Month Rollover</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.devBtn} onPress={async () => {
              const keys = await AsyncStorage.getAllKeys();
              for (const key of keys) { const val = await AsyncStorage.getItem(key); console.log(`${key}:`, val); }
              showSnackbar('Logged to Console', 'success');
            }}>
              <Text style={styles.devBtnText}>Log AsyncStorage Data</Text>
            </TouchableOpacity>
          </View>
        )}

      <View style={{ height: 30 }} />
      </KeyboardAwareScrollView>

      <DeleteCategoryModal
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
        onConfirm={confirmDeleteCategory}
        categoryName={categoryToDelete || ''}
      />

        <CustomAlert
          visible={alertVisible}
          title="Clear Completed Lists"
          message="This will permanently delete all completed grocery lists and their attached receipt photos. This cannot be undone."
          confirmLabel="Clear Data"
          confirmVariant="danger"
          Icon={TrashIcon}
          onConfirm={async () => {
            setAlertVisible(false);
            await clearCompletedLists();
            showSnackbar('Completed lists cleared', 'success');
          }}
          onCancel={() => setAlertVisible(false)}
        />

        <CustomAlert
          visible={voiceAlertVisible}
          title="Clear Voice Memos"
          message="This will permanently delete all saved voice memos. This cannot be undone."
          confirmLabel="Clear Memos"
          confirmVariant="danger"
          Icon={Mic}
          onConfirm={async () => {
            setVoiceAlertVisible(false);
            await clearAllMemos();
            showSnackbar('Voice memos cleared', 'success');
          }}
          onCancel={() => setVoiceAlertVisible(false)}
        />
    </SafeAreaView>  );
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

  sectionHeader: { marginBottom: 12, marginTop: 16 },
  sectionTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 18 },
  sectionSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 1 },

  budgetMainCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  allocationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  allocationLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  totalInputWrapper: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4, borderWidth: 1, minHeight: 64, justifyContent: 'center' },
  totalInputRow: { flexDirection: 'row', alignItems: 'center' },
  totalCurrency: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', marginRight: 10 },
  totalInput: { fontSize: 20, fontFamily: 'Outfit_600SemiBold', flex: 1, height: 40, padding: 0, textAlignVertical: 'center' },

  allocationPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  pillDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  pillText: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  pillTextSuccess: { color: '#10B981' },
  pillTextDanger: { color: '#EF4444' },

  allocationBarContainer: { marginTop: 10 },
  allocationBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  allocationBarFill: { height: '100%' },
  allocationBarFillDanger: { backgroundColor: '#EF4444' },
  allocationStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  statValue: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  catSectionLabel: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.5 },
  catGridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addCatBtnSmall: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  addCatBtnTextSmall: { fontSize: 9, fontFamily: 'Outfit_800ExtraBold' },

  quickAddCat: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 12, marginBottom: 12, borderWidth: 1, gap: 6 },
  quickAddInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, paddingHorizontal: 6 },
  quickAddDone: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  quickAddDoneText: { fontSize: 9, fontFamily: 'Outfit_800ExtraBold' },
  quickAddCancel: { padding: 4 },
  quickAddCancelText: { fontSize: 13 },

  catBudgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  modernCatCard: { width: '48.5%', padding: 10, borderRadius: 16, borderWidth: 1 },
  catCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  catIconBox: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  catName: { fontFamily: 'Inter_700Bold', fontSize: 9, textTransform: 'uppercase', flex: 1 },
  catPercent: { fontFamily: 'Inter_800ExtraBold', fontSize: 8 },
  catInputContainer: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  catInputCurrency: { fontSize: 9, fontFamily: 'Inter_700Bold', marginRight: 4 },
  catInput: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, flex: 1 },
  deleteCatBtn: { padding: 3, marginRight: 2 },

  mainSaveButton: { borderRadius: 20, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  mainSaveText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 13, letterSpacing: 0.5 },

  dataCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  dataAction: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  exportBtnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2, marginLeft: 54 },
  smallActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 4 },
  smallActionText: { fontFamily: 'Outfit_600SemiBold', fontSize: 12 },
  dataIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dataActionTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },
  dataActionSub: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 1 },
  dataDivider: { height: 1, marginHorizontal: 14 },

  devSection: { marginTop: 16, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  devHeader: { color: '#EF4444', fontFamily: 'Outfit_800ExtraBold', fontSize: 14, marginBottom: 12, textAlign: 'center', letterSpacing: 1.5 },
  devBtn: { backgroundColor: '#EF4444', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  devBtnText: { color: '#0A0A0A', fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5 }
});