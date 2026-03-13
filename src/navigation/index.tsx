import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '@utils/theme';

// Screens
import HomeScreen from '@screens/HomeScreen';
import RecordingScreen from '@screens/RecordingScreen';
import EditorScreen from '@screens/EditorScreen';
import FilesScreen from '@screens/FilesScreen';
import SettingsScreen from '@screens/SettingsScreen';
import PlayerScreen from '@screens/PlayerScreen';

// Types
import { RootStackParamList, MainTabParamList } from '../types/index';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 底部标签导航
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundSecondary,
          borderTopWidth: 0,
          elevation: 0,
          height: 83,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Files':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Statistics':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name='Home' component={HomeScreen} options={{ tabBarLabel: '首页' }} />
      <Tab.Screen name='Files' component={FilesScreen} options={{ tabBarLabel: '文件' }} />
      <Tab.Screen
        name='Statistics'
        component={HomeScreen} // Placeholder
        options={{ tabBarLabel: '统计' }}
      />
      <Tab.Screen name='Profile' component={SettingsScreen} options={{ tabBarLabel: '我的' }} />
    </Tab.Navigator>
  );
};

// 根导航
export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name='Main' component={MainTabNavigator} />
        <Stack.Screen
          name='Recording'
          component={RecordingScreen}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen name='Editor' component={PlayerScreen} />
        <Stack.Screen name='Settings' component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
