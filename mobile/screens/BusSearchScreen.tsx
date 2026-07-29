import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "BusSearch">;

export default function BusSearchScreen({ navigation }: Props) {
  const [origin, setOrigin] = useState("Lusaka");
  const [destination, setDestination] = useState("Ndola");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>From</Text>
      <TextInput style={styles.input} value={origin} onChangeText={setOrigin} />
      <Text style={styles.label}>To</Text>
      <TextInput style={styles.input} value={destination} onChangeText={setDestination} />
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate("BusResults", { origin, destination })}
      >
        <Text style={styles.buttonText}>Search buses</Text>
      </Pressable>
      <Pressable style={styles.linkButton} onPress={() => navigation.navigate("Wallet")}>
        <Text style={styles.linkText}>My wallet & bookings →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#FBF7F0" },
  label: { fontSize: 13, color: "#555", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  button: { backgroundColor: "#0B5D3B", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontWeight: "700" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#0B5D3B", fontWeight: "600" },
});
