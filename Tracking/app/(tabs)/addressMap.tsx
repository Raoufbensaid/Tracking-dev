// app/addressMap.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useRouter, useLocalSearchParams } from "expo-router";

// Calcule une région englobant tous les points, avec un petit padding
function calculateRegion(
  points: { latitude: number; longitude: number }[]
): Region {
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  points.forEach((p) => {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  });
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + 0.05,
    longitudeDelta: maxLng - minLng + 0.05,
  };
}

// Applique un léger offset aux marqueurs proches pour éviter le chevauchement
function spreadMarkers(
  markers: { latitude: number; longitude: number }[]
): { latitude: number; longitude: number }[] {
  const offset = 0.0001;
  const seen: { [key: string]: number } = {};
  return markers.map((marker) => {
    const newMarker = { ...marker };
    const key = `${marker.latitude.toFixed(5)}_${marker.longitude.toFixed(5)}`;
    if (seen[key] === undefined) {
      seen[key] = 0;
    } else {
      seen[key]++;
      newMarker.latitude += offset * seen[key];
      newMarker.longitude += offset * seen[key];
    }
    return newMarker;
  });
}

export default function AddressMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  console.log("Paramètres reçus:", params);

  // Pour éviter que "params" change à chaque rendu, on extrait la chaîne d'adresses une fois.
  const addressesParam = params.addresses as string | undefined;

  // Déclaration des états
  const [addresses, setAddresses] = useState<
    {
      latitude: number;
      longitude: number;
      addressComplete: string;
      nbLogements: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    addressComplete: string;
    nbLogements: string;
  } | null>(null);

  // Parsing des données depuis le paramètre "addresses"
  useEffect(() => {
    if (addressesParam) {
      try {
        const parsed = JSON.parse(addressesParam);
        console.log("Adresses parsées:", parsed);
        setAddresses(parsed);
      } catch (error) {
        console.error("Erreur lors du parsing des adresses:", error);
      }
    } else {
      console.log("Aucun paramètre 'addresses' trouvé.");
    }
    setLoading(false);
  }, [addressesParam]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Chargement...</Text>
      </View>
    );
  }
  if (addresses.length === 0) {
    console.log("Aucune adresse disponible.");
    return (
      <View style={styles.loadingContainer}>
        <Text>Aucune adresse trouvée.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Préparer la liste des coordonnées pour les markers
  const originalMarkers = addresses.map((addr) => ({
    latitude: addr.latitude,
    longitude: addr.longitude,
  }));
  console.log("Markers originaux:", originalMarkers);
  const markers = spreadMarkers(originalMarkers);
  const region = calculateRegion(markers);
  console.log("Région initiale calculée:", region);

  // Fonction appelée lors du clic sur un Marker
  const handleMarkerPress = (addr: {
    addressComplete: string;
    nbLogements: string;
  }) => {
    console.log("Marker press:", addr);
    setSelectedAddress(addr);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            console.log("Bouton Retour pressé");
            router.back();
          }}
        >
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carte des adresses</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Carte utilisant Google Maps */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        minZoomLevel={0}
        onRegionChangeComplete={(reg) => console.log("Nouvelle région:", reg)}
      >
        {addresses.map((addr, index) => {
          console.log(`Rendu du Marker ${index}:`, addr);
          return (
            <Marker
              key={index}
              coordinate={{
                latitude: addr.latitude,
                longitude: addr.longitude,
              }}
              pinColor="red"
              collapsable={false} // Ajout pour éviter les erreurs liées aux Callouts
              onPress={() =>
                handleMarkerPress({
                  addressComplete: addr.addressComplete,
                  nbLogements: addr.nbLogements,
                })
              }
            />
          );
        })}
      </MapView>

      {/* Modal personnalisé pour afficher les détails d'une adresse */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          console.log("Modal fermée");
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAddress && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedAddress.addressComplete}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Nb logements: {selectedAddress.nbLogements}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                console.log("Bouton Fermer pressé");
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textDecorationLine: "underline",
    marginBottom: 10,
  },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  modalButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalButtonText: { color: "#fff", fontSize: 16 },
});
