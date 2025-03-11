// app/addressMap.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";

export default function AddressMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parsing des données passées en paramètres
  let addresses: {
    latitude: number;
    longitude: number;
    addressComplete: string;
    nbLogements: string;
  }[] = [];
  try {
    if (params.addresses) {
      addresses = JSON.parse(params.addresses as string);
    }
  } catch (error) {
    console.error("Erreur lors du parsing des adresses:", error);
  }

  if (!addresses || addresses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Aucune adresse trouvée.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Région initiale centrée sur le premier point
  const initialRegion = {
    latitude: addresses[0].latitude,
    longitude: addresses[0].longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Fonction pour ouvrir les options de navigation
  const openNavigationOptions = (
    latitude: number,
    longitude: number,
    address: string
  ) => {
    Alert.alert(
      "Ouvrir dans",
      "Choisissez une application de navigation",
      [
        {
          text: "Waze",
          onPress: () => {
            const url = `waze://?ll=${latitude},${longitude}&navigate=yes`;
            Linking.canOpenURL(url)
              .then((supported) => {
                if (supported) {
                  Linking.openURL(url);
                } else {
                  Alert.alert("Erreur", "Waze n'est pas installé.");
                }
              })
              .catch((err) => console.error("Erreur Waze", err));
          },
        },
        {
          text: "Google Maps",
          onPress: () => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            Linking.openURL(url).catch((err) =>
              console.error("Erreur Google Maps", err)
            );
          },
        },
        {
          text: "Plans",
          onPress: () => {
            const url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
            Linking.openURL(url).catch((err) =>
              console.error("Erreur Apple Plans", err)
            );
          },
        },
        {
          text: "Annuler",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carte des adresses</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Carte */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        minZoomLevel={0}
      >
        {addresses.map((addr, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: addr.latitude, longitude: addr.longitude }}
            pinColor="red"
          >
            <Callout
              onPress={() =>
                openNavigationOptions(
                  addr.latitude,
                  addr.longitude,
                  addr.addressComplete
                )
              }
            >
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{addr.addressComplete}</Text>
                <Text style={styles.calloutSubtitle}>
                  Nb logements: {addr.nbLogements}
                </Text>
                <Text style={styles.calloutHint}>Appuyez pour naviguer</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  backText: { color: "#fff", fontSize: 16 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  map: { flex: 1 },
  calloutContainer: { width: 180 },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  calloutSubtitle: { fontSize: 12 },
  calloutHint: { fontSize: 10, color: "gray", marginTop: 4 },
});
