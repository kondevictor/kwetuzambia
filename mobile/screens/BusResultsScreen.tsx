import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { api } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "BusResults">;

function formatZmw(minor: number) {
  return `ZMW ${(minor / 100).toFixed(2)}`;
}

export default function BusResultsScreen({ route, navigation }: Props) {
  const { origin, destination } = route.params;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .searchBuses(origin, destination)
      .then((data) => setResults(data.results || []))
      .finally(() => setLoading(false));
  }, [origin, destination]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={styles.container}
      data={results}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No trips found for {origin} → {destination}.</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("Checkout", { tripId: item.id })}>
          <Text style={styles.operator}>
            {item.operator} {item.operatorVerified ? "✓" : ""}
          </Text>
          <Text style={styles.meta}>
            {new Date(item.departAt).toLocaleString()} • {item.availableSeats} seats left
          </Text>
          <Text style={styles.price}>{formatZmw(item.priceBreakdown.totalAmountMinor)}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F0", padding: 16 },
  empty: { textAlign: "center", marginTop: 40, color: "#888" },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 12, elevation: 2 },
  operator: { fontWeight: "700", fontSize: 16, color: "#0B5D3B" },
  meta: { color: "#666", marginTop: 4 },
  price: { color: "#E8792B", fontWeight: "700", fontSize: 16, marginTop: 8 },
});
