import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ShoppingBasket, Camera, Check, ClipboardList } from 'lucide-react-native';
import { useThemeColors } from '../../lib/ThemeContext';
import { useGrocery } from '../../lib/GroceryContext';
import { GroceryList } from '../../lib/store';
import GroceryListDetailModal from './GroceryListDetailModal';
import VoiceMemosList from './VoiceMemosList';

interface Props {
  scrollContainerStyle?: any;
}

export default function GroceryListsView({ scrollContainerStyle }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { lists, createList } = useGrocery();
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedList, setSelectedList] = useState<GroceryList | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  const activeLists = lists.filter(l => l.status === 'active');
  const completedLists = lists.filter(l => l.status === 'complete');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const created = await createList(newTitle.trim());
    setNewTitle('');
    setShowCreateInput(false);
    setSelectedList(created);
    setIsDetailVisible(true);
  };

  const openList = (list: GroceryList) => {
    setSelectedList(list);
    setIsDetailVisible(true);
  };

  const renderListCard = (list: GroceryList) => {
    const totalItems = list.items.length;
    const boughtItems = list.items.filter(i => i.isBought).length;
    const isComplete = list.status === 'complete';
    const hasPhotos = list.photoUris.length > 0;

    return (
      <TouchableOpacity
        key={list.id}
        onPress={() => openList(list)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={[
            styles.listCard,
            { borderColor: colors.cardBorderSubtle },
            isComplete && { 
              backgroundColor: colors.successBg, 
              borderColor: colors.success + '40',
            }
          ]}
        >
          <View style={styles.cardMain}>
            <View style={[styles.cardIconBox, { backgroundColor: isComplete ? colors.successBg : colors.accentBg }]}>
              {isComplete
                ? <Check color={colors.success} size={20} />
                : <ShoppingBasket color={colors.accent} size={20} />
              }
            </View>
            
            <View style={styles.cardCenter}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{list.title}</Text>
              <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
                {new Date(list.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>

            <View style={styles.cardRight}>
              <View style={styles.cardStatsColumn}>
                <Text style={[styles.statValue, { color: isComplete ? colors.success : colors.accent }]}>
                  {boughtItems}/{totalItems}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>BOUGHT</Text>
              </View>

              {hasPhotos && (
                <View style={[styles.photoBadge, { backgroundColor: colors.purpleBg }]}>
                  <Camera color={colors.purple} size={12} />
                  <Text style={[styles.photoBadgeText, { color: colors.purple }]}>{list.photoUris.length}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: colors.divider, height: 4, marginTop: 12 }]}>
            <View style={[
              styles.progressBarFill,
              {
                width: totalItems > 0 ? `${(boughtItems / totalItems) * 100}%` : '0%',
                backgroundColor: isComplete ? colors.success : colors.accent
              }
            ]} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* TOP SECTION: Grocery Lists (Flexible height) */}
      <View style={styles.topSection}>
        <ScrollView 
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Create new list input */}
          {showCreateInput ? (
            <View style={[styles.createCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <TextInput
                style={[styles.createInput, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                placeholder="List name (e.g. Weekly Groceries)"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <View style={styles.createActions}>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.closeBtnBg }]}
                  onPress={() => { setShowCreateInput(false); setNewTitle(''); }}
                >
                  <Text style={[styles.createBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.saveBtnBg, opacity: newTitle.trim() ? 1 : 0.4 }]}
                  onPress={handleCreate}
                  disabled={!newTitle.trim()}
                >
                  <Text style={[styles.createBtnText, { color: colors.saveBtnText }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.accentBg, borderColor: `${colors.accent}20` }]}
              onPress={() => setShowCreateInput(true)}
              activeOpacity={0.7}
            >
              <Plus color={colors.accent} size={18} strokeWidth={2.5} />
              <Text style={[styles.addBtnText, { color: colors.accent }]}>New List</Text>
            </TouchableOpacity>
          )}

          {/* All Lists (Active first, then completed) */}
          {[...activeLists, ...completedLists].map(renderListCard)}

          {/* Empty State */}
          {lists.length === 0 && !showCreateInput && (
            <View style={styles.emptyState}>
              <ClipboardList color={colors.textMuted} size={48} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No grocery lists yet</Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>Tap the button above to create your first list</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* FIXED DIVIDER */}
      <View style={[styles.divider, { backgroundColor: colors.divider }]}>
        <Text style={[styles.dividerLabel, { color: colors.textTertiary, backgroundColor: colors.background }]}>
          VOICE MEMOS
        </Text>
      </View>

      {/* BOTTOM SECTION: Voice Memos (Fixed height) */}
      <View style={styles.bottomSection}>
        <ScrollView 
          contentContainerStyle={styles.scrollPadding}
          showsVerticalScrollIndicator={false}
        >
          <VoiceMemosList />
        </ScrollView>
      </View>

      {/* Detail Modal */}
      <GroceryListDetailModal
        visible={isDetailVisible}
        listId={selectedList?.id || null}
        onClose={() => {
          setIsDetailVisible(false);
          setSelectedList(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { flex: 1 },
  bottomSection: { height: 280, overflow: 'hidden' },
  scrollPadding: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  divider: {
    height: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    zIndex: 10,
  },
  dividerLabel: {
    paddingHorizontal: 12,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    letterSpacing: 2,
    position: 'absolute',
    opacity: 0.8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 16,
  },
  addBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 15 },
  createCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createInput: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  createActions: { flexDirection: 'row', gap: 12 },
  createBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 15 },

  listCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: { flex: 1 },
  cardTitle: { fontFamily: 'Outfit_700Bold', fontSize: 16 },
  cardDate: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 2, opacity: 0.6 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardStatsColumn: { alignItems: 'flex-end', minWidth: 60 },
  statValue: { fontFamily: 'Outfit_800ExtraBold', fontSize: 18, lineHeight: 20 },
  statLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 8, letterSpacing: 0.5 },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoBadgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 9 },
  progressBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20, marginTop: 20 },
  emptySub: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
