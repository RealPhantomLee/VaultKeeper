import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NoteListScreen } from "./components/NoteListScreen";
import { NoteEditorScreen } from "./components/NoteEditorScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { SearchScreen } from "./components/SearchScreen";
import { useThemeStore } from "./stores/theme";

const Stack = createNativeStackNavigator();

export function App() {
  const { isDark } = useThemeStore();

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
            },
            headerTintColor: isDark ? "#e5e5e5" : "#1a1a1a",
          }}
        >
          <Stack.Screen
            name="Notes"
            component={NoteListScreen}
            options={{ title: "VaultKeeper" }}
          />
          <Stack.Screen
            name="Editor"
            component={NoteEditorScreen}
            options={{ title: "Edit Note" }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ title: "Search" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
