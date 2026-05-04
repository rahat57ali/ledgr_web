import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Target, LayoutDashboard, Settings, BarChart2, Calendar as CalendarIcon, CreditCard } from 'lucide-react-native';

import { LedgrProvider, useLedgr } from './src/lib/LedgrContext';
import { GroceryProvider } from './src/lib/GroceryContext';
import { VoiceMemoProvider } from './src/lib/VoiceMemoContext';
import { SnackbarProvider, useSnackbar } from './src/components/Snackbar';
import { ThemeProvider, useTheme } from './src/lib/ThemeContext';
import TrackScreen from './src/screens/TrackScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BillsScreen from './src/screens/BillsScreen';
import MonthEndModal from './src/components/MonthEndModal';

const Tab = createBottomTabNavigator();

function Navigation() {
  const { isBillDueSoon, monthEndData, toggleDevTools } = useLedgr();
  const { showSnackbar } = useSnackbar();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tapCount, setTapCount] = React.useState(0);
  const [lastTap, setLastTap] = React.useState(0);

  const LedgrTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.textPrimary,
      border: colors.cardBorder,
      primary: colors.accent,
    },
  };

  const handleSettingsTap = () => {
    const now = Date.now();
    if (now - lastTap > 2000) {
      setTapCount(1);
    } else {
      const nextCount = tapCount + 1;
      if (nextCount >= 10) {
        toggleDevTools().then(enabled => {
          showSnackbar(enabled ? "🛠️ Dev tools " + (enabled ? "enabled" : "disabled") : "Dev tools toggled");
        });
        setTapCount(0);
      } else {
        setTapCount(nextCount);
      }
    }
    setLastTap(now);
  };

  return (
    <NavigationContainer theme={LedgrTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopWidth: 1,
            borderTopColor: colors.tabBarBorder,
            elevation: 0,
            paddingTop: 10,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            height: 65 + (insets.bottom > 0 ? insets.bottom : 0),
          },
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: {
            fontFamily: 'Inter_500Medium',
            fontSize: 10,
            marginTop: 4
          }
        }}
      >
        <Tab.Screen
          name="Track"
          component={TrackScreen}
          options={{
            tabBarIcon: ({ color, focused }) => <Target color={focused ? colors.accent : color} size={22} />
          }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarIcon: ({ color, focused }) => <BarChart2 color={focused ? colors.warning : color} size={22} />
          }}
        />
        <Tab.Screen
          name="Overview"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ color, focused }) => <LayoutDashboard color={focused ? colors.purple : color} size={22} />
          }}
        />
        <Tab.Screen
          name="Bills"
          component={BillsScreen}
          options={{
            tabBarIcon: ({ color, focused }) => <CreditCard color={focused ? colors.danger : color} size={22} />,
            tabBarBadge: isBillDueSoon ? "" : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.danger, minWidth: 8, height: 8, borderRadius: 4, marginTop: 4 }
          }}
        />
        <Tab.Screen
          name="Days"
          component={CalendarScreen}
          options={{
            tabBarIcon: ({ color, focused }) => <CalendarIcon color={focused ? colors.accent : color} size={22} />
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          listeners={{
            tabPress: () => handleSettingsTap(),
          }}
          options={{
            tabBarIcon: ({ color, focused }) => <Settings color={focused ? colors.success : color} size={22} />
          }}
        />
      </Tab.Navigator>

      <MonthEndModal
        visible={!!monthEndData}
        data={monthEndData}
      />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_300Light, Outfit_400Regular, Outfit_600SemiBold, Outfit_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LedgrProvider>
          <GroceryProvider>
            <VoiceMemoProvider>
              <SnackbarProvider>
                <Navigation />
              </SnackbarProvider>
            </VoiceMemoProvider>
          </GroceryProvider>
        </LedgrProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}