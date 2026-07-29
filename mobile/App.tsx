import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./screens/LoginScreen";
import BusSearchScreen from "./screens/BusSearchScreen";
import BusResultsScreen from "./screens/BusResultsScreen";
import CheckoutScreen from "./screens/CheckoutScreen";
import WalletScreen from "./screens/WalletScreen";

export type RootStackParamList = {
  Login: undefined;
  BusSearch: undefined;
  BusResults: { origin: string; destination: string };
  Checkout: { tripId: string };
  Wallet: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerStyle: { backgroundColor: "#0B5D3B" }, headerTintColor: "#fff" }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Kwetu — Sign in" }} />
        <Stack.Screen name="BusSearch" component={BusSearchScreen} options={{ title: "Book a bus" }} />
        <Stack.Screen name="BusResults" component={BusResultsScreen} options={{ title: "Available trips" }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={{ title: "My wallet" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
