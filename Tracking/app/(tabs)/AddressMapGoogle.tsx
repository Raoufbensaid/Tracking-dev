// app/addressMapGoogle.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Alert,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";

const GOOGLE_API_KEY = "AIzaSyCDz7ffM0xAeZ-FK0gs5aep5NWy9fk7eYw"; // Remplacez par votre clé API Google Maps

/**
 * Génère un document HTML optimisé pour mobile, qui utilise l'API Google Maps JavaScript.
 * Le code active le contrôle de rotation et définit la gestion des gestes pour permettre la rotation.
 * Chaque marqueur affiche une InfoWindow avec l'adresse complète, le nombre de logements et un lien pour obtenir l'itinéraire.
 */
function generateHTML(
  addresses: {
    latitude: number;
    longitude: number;
    addressComplete: string;
    nbLogements: string;
  }[]
): string {
  const markersJS = addresses
    .map((addr) => {
      const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`;
      const infoContent = `
        <div style="font-size:14px; font-family:sans-serif;">
          <strong style="text-decoration:underline;">${addr.addressComplete}</strong><br/>
          Nb logements: ${addr.nbLogements}<br/>
          <a target="_blank" href="${directionsLink}">Obtenir itinéraire</a>
        </div>
      `;
      return `{
        position: { lat: ${addr.latitude}, lng: ${addr.longitude} },
        infoContent: \`${infoContent}\`
      }`;
    })
    .join(",\n");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
        <title>Carte des adresses</title>
        <style>
          html, body { height: 100%; margin: 0; padding: 0; }
          #map { height: 100%; width: 100%; }
        </style>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}"></script>
        <script>
          function initMap() {
            var center = { lat: ${addresses[0].latitude}, lng: ${addresses[0].longitude} };
            var map = new google.maps.Map(document.getElementById('map'), {
              zoom: 12,
              center: center,
              mapTypeId: 'roadmap',
              rotateControl: true,        // Affiche le bouton de rotation
              gestureHandling: 'greedy'    // Permet de réagir aux gestes de l'utilisateur
            });
            
            // Icône personnalisée pour agrandir les marqueurs à 60x60 pixels
            var icon = {
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
              scaledSize: new google.maps.Size(60, 60)
            };

            var markers = [${markersJS}];
            markers.forEach(function(markerData) {
              var marker = new google.maps.Marker({
                position: markerData.position,
                map: map,
                icon: icon
              });
              
              var infowindow = new google.maps.InfoWindow({
                content: markerData.infoContent
              });
              
              marker.addListener('click', function() {
                infowindow.open(map, marker);
              });
            });
          }
        </script>
      </head>
      <body onload="initMap()">
        <div id="map"></div>
      </body>
    </html>
  `;
}

export default function AddressMapGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const headerHeight = 60; // Hauteur approximative de l'en-tête

  console.log("Paramètres reçus:", params);

  const addressesParam = params.addresses as string | undefined;

  const [addresses, setAddresses] = useState<
    {
      latitude: number;
      longitude: number;
      addressComplete: string;
      nbLogements: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    addressComplete: string;
    nbLogements: string;
  } | null>(null);

  useEffect(() => {
    if (addressesParam) {
      try {
        const parsed = JSON.parse(addressesParam);
        console.log("Adresses parsées:", parsed);
        setAddresses(parsed);
        const html = generateHTML(parsed);
        setHtmlContent(html);
      } catch (error) {
        console.error("Erreur lors du parsing des adresses:", error);
      }
    } else {
      console.log("Aucun paramètre 'addresses' trouvé.");
    }
    setLoading(false);
  }, [addressesParam]);

  if (loading || !htmlContent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Chargement...</Text>
      </View>
    );
  }

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

      {/* WebView affichant la carte Google Maps en mode mobile */}
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={{ width, height: height - headerHeight }}
      />

      {/* Modal pour afficher les détails d'une adresse (si nécessaire) */}
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
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  backText: { color: "#fff", fontSize: 16 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
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
