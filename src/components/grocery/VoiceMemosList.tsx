import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Play, Pause, Trash2, Check, X, Circle, Info } from 'lucide-react-native';
import { useThemeColors } from '../../lib/ThemeContext';
import { useVoiceMemos } from '../../lib/VoiceMemoContext';
import { VoiceMemo } from '../../lib/store';
import { format } from 'date-fns';

export default function VoiceMemosList() {
  const colors = useThemeColors();
  const { 
    memos, isRecording, recordingDuration, currentlyPlayingId, permissionStatus,
    startRecording, stopRecording, playMemo, pauseMemo, deleteMemo, requestPermissions 
  } = useVoiceMemos();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const pressInTimeRef = React.useRef(0);
  const isToggleModeRef = React.useRef(false);

  const recordPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => permissionStatus !== 'denied',
      onMoveShouldSetPanResponderCapture: () => permissionStatus !== 'denied',
      onStartShouldSetPanResponder: () => permissionStatus !== 'denied',
      onMoveShouldSetPanResponder: () => permissionStatus !== 'denied',
      onPanResponderGrant: () => {
        setDeletingId(null);
        Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true }).start();
        
        if (isRecording || isToggleModeRef.current) {
          isToggleModeRef.current = false;
          stopRecording();
        } else {
          pressInTimeRef.current = Date.now();
          startRecording();
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        
        if (pressInTimeRef.current > 0) {
          const holdDuration = Date.now() - pressInTimeRef.current;
          pressInTimeRef.current = 0;
          
          if (holdDuration < 400) {
            // Short tap: keep recording (toggle mode)
            isToggleModeRef.current = true;
          } else {
            // Long hold: stop recording on release
            stopRecording();
          }
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        stopRecording();
        pressInTimeRef.current = 0;
        isToggleModeRef.current = false;
      }
    })
  ).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderMemo = (memo: VoiceMemo) => {
    const isPlaying = currentlyPlayingId === memo.id;
    const isDeleting = deletingId === memo.id;

    return (
      <LinearGradient
        key={memo.id}
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={[styles.memoCard, { borderColor: colors.cardBorderSubtle }]}
      >
        <View style={styles.memoInfo}>
          <Text style={[styles.memoDate, { color: colors.textPrimary }]}>
            {format(new Date(memo.createdAt), 'dd MMM yyyy, h:mm a')}
          </Text>
          <Text style={[styles.memoDuration, { color: colors.textTertiary }]}>
            {formatDuration(memo.durationMs)}
          </Text>
        </View>

        <View style={styles.memoActions}>
          <TouchableOpacity 
            style={styles.inlineBtn}
            onPress={() => isPlaying ? pauseMemo() : playMemo(memo.id)}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isPlaying 
              ? <Pause color={colors.accent} size={18} />
              : <Play color={colors.accent} size={18} />
            }
          </TouchableOpacity>

          {isDeleting ? (
            <View style={styles.confirmRow}>
              <TouchableOpacity 
                style={styles.inlineBtn}
                onPress={() => { deleteMemo(memo.id); setDeletingId(null); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Check color={colors.success} size={16} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.inlineBtn}
                onPress={() => setDeletingId(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={colors.textSecondary} size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.inlineBtn}
              onPress={() => setDeletingId(memo.id)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 color={colors.textTertiary} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      {permissionStatus === 'denied' && (
        <View style={[styles.permissionNotice, { backgroundColor: colors.accentBg }]}>
          <Info color={colors.accent} size={16} />
          <Text style={[styles.permissionText, { color: colors.textPrimary }]}>
            Microphone access is denied. Enable it in device settings to record memos.
          </Text>
          <TouchableOpacity onPress={() => requestPermissions()}>
             <Text style={[styles.permissionLink, { color: colors.accent }]}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View 
        style={[
          styles.recordBtn, 
          { 
            backgroundColor: isRecording ? colors.dangerBg : colors.accentBg, 
            borderColor: isRecording ? colors.danger : `${colors.accent}20`,
            transform: [{ scale: scaleAnim }], 
            alignSelf: 'center', 
            width: 'auto',
            opacity: permissionStatus === 'denied' ? 0.5 : 1
          }
        ]}
        {...(permissionStatus !== 'denied' ? recordPanResponder.panHandlers : {})}
      >
          <View style={styles.recordContent}>
            {isRecording ? (
              <>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Circle color={colors.danger} size={14} fill={colors.danger} />
                </Animated.View>
                <Text style={[styles.recordText, { color: colors.danger, fontSize: 13 }]}>
                  RECORDING... ({formatDuration(recordingDuration)})
                </Text>
              </>
            ) : (
              <>
                <Mic color={colors.accent} size={16} strokeWidth={2.5} />
                <Text style={[styles.recordText, { color: colors.accent }]}>Record Memo</Text>
              </>
            )}
          </View>
      </Animated.View>

      <View style={styles.memoList}>
        {memos.length > 0 ? (
          memos.map(renderMemo)
        ) : (
          <View style={styles.emptyState}>
            <Mic color={colors.textMuted} size={40} opacity={0.3} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No voice memos yet. Record one to remember an expense.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 16,
  },
  recordContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordText: { fontFamily: 'Outfit_700Bold', fontSize: 15 },
  memoList: { gap: 12 },
  memoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 0,
  },
  memoInfo: { flex: 1 },
  memoDate: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
  memoDuration: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2, opacity: 0.6 },
  memoActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  inlineBtn: {
    padding: 4,
  },
  confirmRow: { flexDirection: 'row', gap: 12 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  permissionNotice: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  permissionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  permissionLink: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    textDecorationLine: 'underline',
  }
});
