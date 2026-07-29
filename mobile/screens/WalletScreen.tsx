import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { api } from "../api";

function formatZmw(minor: number) {
  return `ZMW ${(minor / 100).toFixed(2)}`;
}

export default function WalletScreen() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.myDashboard().then(setData).catch(() => setData({ error: true }));
  }, []);

  if (!data) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (data.error) return <Text style={styles.empty}>Could not load wallet — please sign in again.</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.walletCard}>
        <Text style={styles.balanceLabel}>K-Cash loyalty points</Text>
        <Text style={styles.balance}>{data.wallet.loyaltyPoints}</Text>
        <Text style={styles.reward}>
          {data.wallet.untilNextReward === 0
            ? "Your next booking's service fee is waived!"
            : `${data.wallet.untilNextReward} more booking(s) to a free service fee`}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recent bus bookings</Text>
      <FlatList
        data={data.busBookings}
        keyExtractor={(item: any) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No bus bookings yet.</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.trip.route.origin} → {item.trip.route.destination}
            </Text>
            <Text style={styles.rowMeta}>
              {item.status} · {formatZmw(item.totalMinor)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F0", padding: 16 },
  walletCard: { backgroundColor: "#0B5D3B", borderRadius: 12, padding: 20, marginBottom: 20 },
  balanceLabel: { color: "#cde9dc", fontSize: 13 },
  balance: { color: "#fff", fontSize: 32, fontWeight: "700" },
  reward: { color: "#F2A65A", marginTop: 8, fontSize: 13 },
  sectionTitle: { fontWeight: "700", fontSize: 16, marginBottom: 8, color: "#0B5D3B" },
  row: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 8 },
  rowTitle: { fontWeight: "600" },
  rowMeta: { color: "#666", marginTop: 2, fontSize: 12 },
  empty: { color: "#888", textAlign: "center", marginTop: 20 },
});
