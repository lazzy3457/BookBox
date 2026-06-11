import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { LoadingState } from "./src/components/Screen";
import { AuthorDetailsScreen } from "./src/screens/AuthorDetailsScreen";
import { BookDetailsScreen } from "./src/screens/BookDetailsScreen";
import { CommunityScreen } from "./src/screens/CommunityScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { ListDetailsScreen } from "./src/screens/ListDetailsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { PublicProfileScreen } from "./src/screens/PublicProfileScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from "./src/types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.ink },
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.paper
      }}
    >
      <AuthStack.Screen component={LoginScreen} name="Login" options={{ title: "Connexion" }} />
      <AuthStack.Screen component={RegisterScreen} name="Register" options={{ title: "Inscription" }} />
    </AuthStack.Navigator>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ color: focused ? colors.mint : colors.muted, fontSize: 11, fontWeight: "900" }}>{label}</Text>;
}

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ color: focused ? colors.mint : colors.muted, fontSize: 21, fontWeight: "900" }}>{icon}</Text>;
}

function MainNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.paper,
        tabBarActiveTintColor: colors.mint,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.line
        }
      }}
    >
      <MainTabs.Screen
        component={HomeScreen}
        name="Home"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⌂" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Accueil" />,
          title: "Accueil"
        }}
      />
      <MainTabs.Screen
        component={SearchScreen}
        name="Search"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⌕" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Recherche" />,
          title: "Recherche"
        }}
      />
      <MainTabs.Screen
        component={LibraryScreen}
        name="Library"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="▤" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Biblio" />,
          title: "Bibliotheque"
        }}
      />
      <MainTabs.Screen
        component={CommunityScreen}
        name="Community"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◎" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Commu" />,
          title: "Communaute"
        }}
      />
      <MainTabs.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="◉" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Profil" />,
          title: "Profil"
        }}
      />
    </MainTabs.Navigator>
  );
}

function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.ink },
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.paper
      }}
    >
      {token ? (
        <>
          <RootStack.Screen component={MainNavigator} name="Main" options={{ headerShown: false }} />
          <RootStack.Screen component={BookDetailsScreen} name="BookDetails" options={{ title: "Livre" }} />
          <RootStack.Screen component={AuthorDetailsScreen} name="AuthorDetails" options={{ title: "Auteur" }} />
          <RootStack.Screen component={ListDetailsScreen} name="ListDetails" options={{ title: "Liste" }} />
          <RootStack.Screen component={PublicProfileScreen} name="PublicProfile" options={{ title: "Lecteur" }} />
          <RootStack.Screen component={SettingsScreen} name="Settings" options={{ title: "Parametres" }} />
        </>
      ) : (
        <RootStack.Screen component={AuthNavigator} name="Auth" options={{ headerShown: false }} />
      )}
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
