import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Image, Keyboard, Platform, KeyboardAvoidingView, Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  X, Plus, Check, Trash2, Camera, ShoppingBasket, Pencil,
  Receipt, CircleCheck, Circle, Minus
} from 'lucide-react-native';
import CustomAlert from '../CustomAlert';
import { useThemeColors } from '../../lib/ThemeContext';
import { useGrocery } from '../../lib/GroceryContext';
import { useLedgr } from '../../lib/LedgrContext';
import { useSnackbar } from '../Snackbar';
import { ExpenseCategory, GroceryItem, GroceryList } from '../../lib/store';
import GroceryPhotoViewer from './GroceryPhotoViewer';


interface Props {
  visible: boolean;
  listId: string | null;
  onClose: () => void;
}

export default function GroceryListDetailModal({ visible, listId, onClose }: Props) {
  const colors = useThemeColors();
  const { lists, updateList, deleteList, addItem, updateItem, removeItem, toggleBought, addPhoto, removePhoto, markComplete, logAsExpenses } = useGrocery();
  const { allCategories } = useLedgr();
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();

  const list = lists.find(l => l.id === listId) || null;
  const isComplete = list?.status === 'complete';

  // Add item form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemCategory, setItemCategory] = useState<ExpenseCategory>('Grocery');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit item
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('Grocery');

  // Title edit
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');


  // Photo viewer
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  // Keyboard visibility & Animation for stability
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const totalBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animateBar = (toValue: number, duration: number = 200) => {
      Animated.timing(totalBarAnim, {
        toValue,
        duration,
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        animateBar(0, 150);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Delay hide slightly to see if another focus is incoming (prevents "Next" flicker)
        setTimeout(() => {
          if (!Keyboard.isVisible()) {
            setIsKeyboardVisible(false);
            animateBar(1, 250);
          }
        }, 50);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    confirmVariant?: 'default' | 'danger' | 'success';
    Icon?: any;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (config: Omit<typeof alertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const priceRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToEnd = () => {
    // Delay slightly to allow layout to settle
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  useEffect(() => {
    if (list) {
      setEditTitle(list.title);
    }
    setShowAddForm(false);
    setEditingItem(null);
  }, [listId, visible]);

  if (!list) return null;

  const boughtCount = list.items.filter(i => i.isBought).length;
  const totalCount = list.items.length;
  const estimatedTotal = list.items.reduce((s, i) => s + (i.estimatedPrice * i.quantity), 0);
  const boughtTotal = list.items.filter(i => i.isBought).reduce((s, i) => s + (i.estimatedPrice * i.quantity), 0);
  const allBought = totalCount > 0 && boughtCount === totalCount;

  const handleAddItem = async () => {
    if (!itemName.trim()) return;
    await addItem(list.id, {
      name: itemName.trim(),
      estimatedPrice: parseFloat(itemPrice) || 0,
      quantity: parseInt(itemQty) || 1,
      category: 'Grocery',
      isBought: false,
    });
    setItemName('');
    setItemPrice('');
    setItemQty('1');
    showSnackbar('Item added', 'success');
    nameRef.current?.focus();
    scrollToEnd();
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editName.trim()) return;
    await updateItem(list.id, {
      ...editingItem,
      name: editName.trim(),
      estimatedPrice: parseFloat(editPrice) || 0,
      quantity: parseInt(editQty) || 1,
      category: 'Grocery',
    });
    setEditingItem(null);
    showSnackbar('Item updated', 'success');
  };

  const handleDeleteItem = (itemId: string) => {
    showAlert({
      title: 'Remove Item',
      message: 'Remove this item from the list?',
      confirmLabel: 'Remove',
      confirmVariant: 'danger',
      Icon: Trash2,
      onConfirm: () => {
        removeItem(list.id, itemId);
        hideAlert();
      }
    });
  };

  const handleToggle = async (itemId: string) => {
    // Optimistic check for "all bought"
    const willBeBought = !list.items.find(i => i.id === itemId)?.isBought;
    const otherItemsBought = list.items.filter(i => i.id !== itemId).every(i => i.isBought);
    const isNowAllBought = willBeBought && otherItemsBought && list.items.length > 0;

    await toggleBought(list.id, itemId);

    if (isNowAllBought && list.status === 'active') {
      setTimeout(() => {
        showAlert({
          title: 'All Done!',
          message: 'All items are bought. Mark this list as complete?',
          confirmLabel: 'Complete',
          confirmVariant: 'success',
          Icon: CircleCheck,
          onConfirm: () => {
            markComplete(list.id);
            hideAlert();
            showSnackbar('List completed!', 'success');
          }
        });
      }, 300);
    }
  };

  const handleTitleSave = async () => {
    if (editTitle.trim() && editTitle.trim() !== list.title) {
      await updateList({ ...list, title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAttachPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await addPhoto(list.id, result.assets[0].uri);
      showSnackbar('Receipt photo attached', 'success');
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take receipt photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      await addPhoto(list.id, result.assets[0].uri);
      showSnackbar('Receipt photo taken', 'success');
    }
  };

  const handleDeleteList = () => {
    showAlert({
      title: 'Delete List',
      message: 'This will permanently delete the list and all attached receipt photos. This cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      Icon: Trash2,
      onConfirm: async () => {
        hideAlert();
        await deleteList(list.id);
        onClose();
        showSnackbar('List deleted', 'success');
      }
    });
  };

  const handleLogExpenses = () => {
    const boughtWithPrice = list.items.filter(i => i.isBought && i.estimatedPrice > 0);
    if (boughtWithPrice.length === 0) {
      showSnackbar('No bought items with prices found to log.', 'warning');
      return;
    }

    showAlert({
      title: 'Log as Expenses',
      message: `This will create ${boughtWithPrice.length} expense entries from bought items. Continue?`,
      confirmLabel: 'Log',
      Icon: Receipt,
      onConfirm: async () => {
        hideAlert();
        const result = await logAsExpenses(list.id);
        if (result.success) {
          showSnackbar(result.message, 'success');
        } else {
          showSnackbar(result.message, 'error');
        }
      }
    });
  };

  const startEditItem = (item: GroceryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.estimatedPrice > 0 ? item.estimatedPrice.toString() : '');
    setEditQty(item.quantity.toString());
  };


  const renderItemRow = (item: GroceryItem) => {

    if (editingItem?.id === item.id) {
      return (
        <View key={item.id} style={[styles.editItemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <TextInput
            style={[styles.editInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.editRow}>
            <View style={[styles.editInputSmall, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1.5 }]}>
              <Text style={[styles.editPrefix, { color: colors.accent }]}>PKR</Text>
              <TextInput
                style={[styles.editInputInner, { color: colors.textPrimary }]}
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: colors.pillBg }]}
                onPress={() => setEditQty(Math.max(1, parseInt(editQty || '1') - 1).toString())}
              >
                <Minus size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{editQty || '1'}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: colors.pillBg }]}
                onPress={() => setEditQty((parseInt(editQty || '1') + 1).toString())}
              >
                <Plus size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity style={[styles.editActionBtn, { backgroundColor: colors.closeBtnBg }]} onPress={() => setEditingItem(null)}>
              <Text style={[styles.editActionText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editActionBtn, { backgroundColor: colors.saveBtnBg }]} onPress={handleUpdateItem}>
              <Text style={[styles.editActionText, { color: colors.saveBtnText }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        key={item.id} 
        activeOpacity={0.6}
        onPress={() => !isComplete && handleToggle(item.id)}
        disabled={isComplete}
        style={[styles.itemRow, { borderBottomColor: colors.divider }]}
      >
        <View style={styles.checkbox}>
          {item.isBought
            ? <CircleCheck color={colors.success} size={24} />
            : <Circle color={colors.textMuted} size={24} />
          }
        </View>
        <View style={styles.itemInfo}>
          <Text style={[
            styles.itemName, 
            { color: item.isBought ? colors.textTertiary : colors.textPrimary }
          ]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.itemMetaRow}>
            {item.quantity > 1 && (
              <View style={[styles.qtyBadge, { backgroundColor: colors.pillBg }]}>
                <Text style={[styles.qtyText, { color: colors.textTertiary }]}>{item.quantity} units</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.itemRight}>
          {item.estimatedPrice > 0 && (
            <Text style={[
              styles.itemPrice, 
              { color: item.isBought ? colors.textMuted : colors.textSecondary }
            ]}>
              PKR {(item.estimatedPrice * item.quantity).toLocaleString()}
            </Text>
          )}
          {!isComplete && (
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => startEditItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Pencil color={colors.textMuted} size={14} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 color={colors.textMuted} size={14} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.closeBtnBg }]}>
            <X color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {isEditingTitle ? (
              <TextInput
                style={[styles.titleInput, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
                value={editTitle}
                onChangeText={setEditTitle}
                onBlur={handleTitleSave}
                onSubmitEditing={handleTitleSave}
                autoFocus
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity onPress={() => !isComplete && setIsEditingTitle(true)}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{list.title}</Text>
              </TouchableOpacity>
            )}
            {isComplete && (
              <View style={[styles.completeBadge, { backgroundColor: colors.successBg }]}>
                <Text style={[styles.completeBadgeText, { color: colors.success }]}>COMPLETED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Scrollable Content Area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Items */}
          {list.items.map(renderItemRow)}

          {list.items.length === 0 && (
            <View style={styles.emptyItems}>
              <ShoppingBasket color={colors.textMuted} size={36} />
              <Text style={[styles.emptyItemsText, { color: colors.textTertiary }]}>No items yet — add your first item below</Text>
            </View>
          )}

          {/* Receipt Photos */}
          {list.photoUris.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={[styles.photosLabel, { color: colors.textTertiary }]}>RECEIPT PHOTOS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photosRow}>
                  {list.photoUris.map((uri, idx) => (
                    <TouchableOpacity key={uri} onPress={() => { setPhotoViewerIndex(idx); setPhotoViewerVisible(true); }}>
                      <Image source={{ uri }} style={[styles.photoThumb, { borderColor: colors.cardBorderSubtle }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Post-Completion Actions */}
          {isComplete && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.actionSection}>
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: colors.accentBg, borderColor: `${colors.accent}30` }]} onPress={handleAttachPhoto}>
                    <Camera color={colors.accent} size={18} />
                    <Text style={[styles.photoActionBtnText, { color: colors.accent }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: colors.purpleBg, borderColor: `${colors.purple}30` }]} onPress={handleTakePhoto}>
                    <Camera color={colors.purple} size={18} />
                    <Text style={[styles.photoActionBtnText, { color: colors.purple }]}>Camera</Text>
                  </TouchableOpacity>
                </View>

                {list.items.length > 0 && (
                  <TouchableOpacity 
                    style={[
                      styles.actionBtn, 
                      { backgroundColor: colors.accentBg, borderColor: `${colors.accent}30` },
                      list.items.filter(i => i.isBought && i.estimatedPrice > 0).length === 0 && { opacity: 0.4 }
                    ]} 
                    onPress={handleLogExpenses}
                    disabled={list.items.filter(i => i.isBought && i.estimatedPrice > 0).length === 0}
                  >
                    <Receipt color={colors.accent} size={18} />
                    <Text style={[styles.actionBtnText, { color: colors.accent }]}>Log as Expenses</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={[styles.deleteListBtn, { backgroundColor: colors.dangerBg, borderColor: `${colors.danger}30` }]} onPress={handleDeleteList}>
                <Trash2 color={colors.danger} size={16} />
                <Text style={[styles.deleteListText, { color: colors.danger }]}>Delete List</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isComplete && allBought && (
            <View style={[styles.actionSection, { marginBottom: 20 }]}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.successBg, borderColor: `${colors.success}30` }]}
                onPress={() => { markComplete(list.id); showSnackbar('List completed!', 'success'); }}
              >
                <Check color={colors.success} size={18} />
                <Text style={[styles.actionBtnText, { color: colors.success }]}>Mark as Complete</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingBottom: isKeyboardVisible ? 0 : Math.max(insets.bottom, 16) }}>
          {/* Sticky Add Item Section */}
          {!isComplete && !editingItem && (
            <View style={[styles.stickyAddContainer, { backgroundColor: colors.background }]}>
              {showAddForm ? (
                <View style={[styles.compactAddCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.compactAddRow}>
                    <TextInput
                      ref={nameRef}
                      style={[styles.compactInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, flex: 2.5 }]}
                      placeholder="Item name"
                      placeholderTextColor={colors.textMuted}
                      value={itemName}
                      onChangeText={setItemName}
                      autoFocus
                      returnKeyType="next"
                      onSubmitEditing={() => priceRef.current?.focus()}
                    />
                    <View style={[styles.compactInput, styles.compactPriceInput, { backgroundColor: colors.inputBg, flex: 1 }]}>
                      <Text style={[styles.addPrefix, { color: colors.accent }]}>PKR</Text>
                      <TextInput
                        ref={priceRef}
                        style={[styles.addInputInner, { color: colors.textPrimary }]}
                        value={itemPrice}
                        onChangeText={setItemPrice}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={handleAddItem}
                      />
                    </View>
                  </View>

                  <View style={[styles.compactAddRow, { marginTop: 12 }]}>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: colors.pillBg }]}
                        onPress={() => setItemQty(Math.max(1, parseInt(itemQty || '1') - 1).toString())}
                      >
                        <Minus size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={[styles.stepValue, { color: colors.textPrimary, fontSize: 15 }]}>{itemQty || '1'}</Text>
                      <TouchableOpacity
                        style={[styles.stepBtn, { backgroundColor: colors.pillBg }]}
                        onPress={() => setItemQty((parseInt(itemQty || '1') + 1).toString())}
                      >
                        <Plus size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={[styles.iconActionBtn]} onPress={() => setShowAddForm(false)}>
                      <X color={colors.textMuted} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconActionBtn, { backgroundColor: colors.saveBtnBg, opacity: itemName.trim() ? 1 : 0.4, borderRadius: 23 }]}
                      onPress={handleAddItem}
                      disabled={!itemName.trim()}
                    >
                      <Plus color={colors.saveBtnText} size={24} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addItemBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorderSubtle, marginHorizontal: 16 }]}
                  onPress={() => setShowAddForm(true)}
                >
                  <Plus color={colors.accent} size={18} />
                  <Text style={[styles.addItemBtnText, { color: colors.accent }]}>Add Item</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Running Total Bar Area */}
          <View style={[styles.totalBarContainer, { height: (list.items.length > 0 && !editingItem) ? 70 : 0 }]}>
            {(list.items.length > 0 && !editingItem) && (
              <Animated.View 
              style={[
                styles.totalBar, 
                { 
                  backgroundColor: colors.surface, 
                  borderTopColor: colors.divider,
                  opacity: totalBarAnim,
                  transform: [{
                    translateY: totalBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0]
                    })
                  }]
                }
              ]}
              pointerEvents={isKeyboardVisible ? 'none' : 'auto'}
            >
              <View style={styles.totalCol}>
                <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>EST. TOTAL</Text>
                <Text style={[styles.totalValue, { color: colors.textPrimary }]}>PKR {estimatedTotal.toLocaleString()}</Text>
              </View>
              <View style={[styles.totalDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.totalCol}>
                <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>BOUGHT</Text>
                <Text style={[styles.totalValue, { color: colors.accent }]}>PKR {boughtTotal.toLocaleString()}</Text>
              </View>
            </Animated.View>
          )}
          </View>
        </View>

        {/* Support Components */}
        <GroceryPhotoViewer
          visible={photoViewerVisible}
          photos={list.photoUris}
          initialIndex={photoViewerIndex}
          onClose={() => setPhotoViewerVisible(false)}
          onDelete={(uri) => removePhoto(list.id, uri)}
        />
        <CustomAlert 
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onConfirm={alertConfig.onConfirm}
          onCancel={hideAlert}
          confirmLabel={alertConfig.confirmLabel}
          confirmVariant={alertConfig.confirmVariant}
          Icon={alertConfig.Icon}
        />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 18 },
  titleInput: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, borderBottomWidth: 2, paddingBottom: 4, textAlign: 'center', minWidth: 160 },
  completeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  completeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  // Group header
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  // Item row
  itemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    gap: 12 
  },
  checkbox: { padding: 2 },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Inter_500Medium', fontSize: 16, letterSpacing: -0.3 },
  itemMetaRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  qtyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  qtyText: { fontFamily: 'Inter_700Bold', fontSize: 9, opacity: 0.8 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemPrice: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },
  itemActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  // Empty items
  emptyItems: { alignItems: 'center', paddingVertical: 64 },
  emptyItemsText: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 16, textAlign: 'center', opacity: 0.6 },
  // Stepper
  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, minWidth: 16, textAlign: 'center' },
  // Add item
  addItemBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    height: 44, 
    borderRadius: 100, 
    borderWidth: 1, 
    marginTop: 16
  },
  addItemBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 14 },
  stickyAddContainer: { 
    width: '100%',
    zIndex: 10,
    marginBottom: 16,
  },
  compactAddCard: { 
    paddingHorizontal: 20, 
    paddingTop: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  compactAddRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  compactInput: { 
    fontFamily: 'Inter_600SemiBold', 
    fontSize: 15, 
    borderRadius: 16, 
    height: 52, 
    paddingHorizontal: 16, 
    borderWidth: 0 
  },
  compactPriceInput: { flexDirection: 'row', alignItems: 'center' },
  addPrefix: { fontFamily: 'Inter_800ExtraBold', fontSize: 11, marginRight: 6, opacity: 0.5 },
  addInputInner: { flex: 1, fontFamily: 'Outfit_700Bold', fontSize: 17, padding: 0 },
  iconActionBtn: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // Edit item
  editItemCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginVertical: 8 },
  editInput: { fontFamily: 'Inter_500Medium', fontSize: 15, borderRadius: 12, height: 44, paddingHorizontal: 14, borderWidth: 1, marginBottom: 8 },
  editRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  editInputSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 44, paddingHorizontal: 12, borderWidth: 1 },
  editPrefix: { fontFamily: 'Inter_700Bold', fontSize: 11, marginRight: 6 },
  editInputInner: { flex: 1, fontFamily: 'Outfit_600SemiBold', fontSize: 16, padding: 0 },
  editActions: { flexDirection: 'row', gap: 8 },
  editActionBtn: { flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editActionText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 13 },
  // Photos
  photosSection: { marginTop: 24 },
  photosLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, letterSpacing: 1.5, marginBottom: 16, opacity: 0.6 },
  photosRow: { flexDirection: 'row', gap: 12 },
  photoThumb: { width: 72, height: 72, borderRadius: 12, borderWidth: 1 },
  photoActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1 },
  photoActionBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 14 },
  // Actions
  actionSection: { marginTop: 32, gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 16, borderWidth: 1 },
  actionBtnText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 15 },
  // Delete
  deleteListBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1, marginTop: 24 },
  deleteListText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
  // Total bar
  totalBarContainer: { width: '100%', overflow: 'hidden' },
  totalBar: { 
    flex: 1,
    flexDirection: 'row', 
    paddingHorizontal: 24, 
    borderTopWidth: 1, 
    alignItems: 'center' 
  },
  totalCol: { flex: 1, alignItems: 'center' },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginBottom: 4, opacity: 0.5 },
  totalValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 22 },
  totalDivider: { width: 1, height: 32 },
});
