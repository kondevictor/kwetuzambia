import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { api } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

function formatZmw(minor: number) {
  return `ZMW ${(minor / 100).toFixed(2)}`;
}

export default function CheckoutScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState<any>(null);
  const [seatNo, setSeatNo] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [msisdn, setMsisdn] = useState("0977000000");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getTrip(tripId).then(setTrip);
  }, [tripId]);

  async function onPay() {
    if (!seatNo || !passengerName) {
      Alert.alert("Missing info", "Pick a seat and enter the passenger name.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.checkoutBus({
        tripId,
        seatNos: [seatNo],
        passengerName,
        method: "MTN_MONEY",
        msisdnOrCardRef: msisdn,
      });
      if (result.status === "SUCCEEDED") {
        Alert.alert("Booking confirmed", `Reference ${result.reference}. Seat guaranteed — show this at boarding.`);
        navigation.popToTop();
      } else {
        Alert.alert("Payment failed", "Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Checkout error", e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!trip) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const available = trip.seats.filter((s: any) => s.status === "AVAILABLE");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.route}>
        {trip.origin} → {trip.destination}
      </Text>
      <Text style={styles.meta}>{trip.operator} · {trip.busPlate}</Text>

      <Text style={styles.label}>Pick a seat</Text>
      <View style={styles.seatGrid}>
        {available.map((s: any) => (
          <Pressable
            key={s.id}
            style={[styles.seat, seatNo === s.seatNo && styles.seatSelected]}
            onPress={() => setSeatNo(s.seatNo)}
          >
            <Text style={[styles.seatText, seatNo === s.seatNo && styles.seatTextSelected]}>{s.seatNo}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Passenger name</Text>
      <TextInput style={styles.input} value={passengerName} onChangeText={setPassengerName} />

      <Text style={styles.label}>Mobile money number (Airtel/MTN/Zamtel)</Text>
      <TextInput style={styles.input} value={msisdn} onChangeText={setMsisdn} keyboardType="phone-pad" />

      <Text style={styles.priceNote}>
        Fare + Kwetu service fee + VAT are itemized at checkout — never a surprise charge. Payment is
        simulated in this build (MockMoneyProvider) — see BUILD_GUIDE.md for swapping in a real PSP.
      </Text>

      <Pressable style={styles.button} onPress={onPay} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Processing..." : "Confirm & pay"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F0", padding: 16 },
  route: { fontSize: 20, fontWeight: "700", color: "#0B5D3B" },
  meta: { color: "#666", marginBottom: 16 },
  label: { fontSize: 13, color: "#555", marginTop: 12, marginBottom: 6 },
  seatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seat: { borderWidth: 1, borderColor: "#0B5D3B", borderRadius: 6, padding: 10, margin: 4, minWidth: 44, alignItems: "center" },
  seatSelected: { backgroundColor: "#0B5D3B" },
  seatText: { color: "#0B5D3B", fontWeight: "600" },
  seatTextSelected: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, backgroundColor: "#fff" },
  priceNote: { fontSize: 11, color: "#888", marginTop: 16, lineHeight: 16 },
  button: { backgroundColor: "#E8792B", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20, marginBottom: 40 },
  buttonText: { color: "#fff", fontWeight: "700" },
});
