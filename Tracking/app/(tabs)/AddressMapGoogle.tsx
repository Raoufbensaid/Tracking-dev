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
  Button,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";

const GOOGLE_API_KEY = "AIzaSyCDz7ffM0xAeZ-FK0gs5aep5NWy9fk7eYw"; // Remplacez par votre clé API Google Maps

/**
 * Génère le code HTML complet qui intègre une carte Google Maps avec des marqueurs.
 * Si withOrdering est true, chaque marker affiche son numéro d'ordre.
 */
function generateHTML(
  addresses: {
    latitude: number;
    longitude: number;
    addressComplete: string;
    nbLogements: string;
    order?: number;
  }[],
  withOrdering: boolean = false
): string {
  // Création du tableau JS des marqueurs avec label si ordering
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
      const label =
        withOrdering && addr.order
          ? `, label: { text: "${addr.order}", color: "white", fontSize: "16px", fontWeight: "bold" }`
          : "";
      return `{
        position: { lat: ${addr.latitude}, lng: ${addr.longitude} },
        infoContent: \`${infoContent}\`
        ${label}
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
              rotateControl: true,
              gestureHandling: 'greedy'
            });
            
            // Icône personnalisée fixe pour les marqueurs (60x60 pixels)
            var icon = {
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
              scaledSize: new google.maps.Size(60, 60)
            };

            var markers = [${markersJS}];
            markers.forEach(function(markerData) {
              var markerOptions = {
                position: markerData.position,
                map: map,
                icon: icon
              };
              if (markerData.label) {
                markerOptions.label = markerData.label;
              }
              var marker = new google.maps.Marker(markerOptions);
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

/**
 * Trie un tableau d'adresses selon l'algorithme du plus proche voisin.
 */
function computeOptimalOrder(
  addresses: {
    latitude: number;
    longitude: number;
    addressComplete: string;
    nbLogements: string;
  }[]
): {
  latitude: number;
  longitude: number;
  addressComplete: string;
  nbLogements: string;
  order: number;
}[] {
  if (addresses.length < 2)
    return addresses.map((a, i) => ({ ...a, order: i + 1 }));
  const sorted: typeof addresses = [];
  const remaining = [...addresses];
  // Commencer par le premier élément
  sorted.push(remaining.shift()!);
  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((pt, index) => {
      const dLat = pt.latitude - last.latitude;
      const dLng = pt.longitude - last.longitude;
      const distance = dLat * dLat + dLng * dLng; // distance au carré
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    sorted.push(remaining.splice(nearestIndex, 1)[0]);
  }
  // Assigner un numéro d'ordre
  return sorted.map((pt, i) => ({ ...pt, order: i + 1 }));
}

export default function AddressMapGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  const headerHeight = 60; // Hauteur de l'en-tête

  console.log("Paramètres reçus:", params);

  // Extraction du paramètre "addresses"
  const addressesParam = params.addresses as string | undefined;

  const [addresses, setAddresses] = useState<
    {
      latitude: number;
      longitude: number;
      addressComplete: string;
      nbLogements: string;
      order?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState("");
  const [withOrdering, setWithOrdering] = useState(false);

  // Lorsque les adresses sont reçues, on les charge
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

  // Tri optimal et mise à jour du HTML
  const handleComputeOrder = () => {
    console.log("Bouton 'Obtenir l'itinéraire' pressé");
    const sorted = computeOptimalOrder(addresses);
    console.log("Adresses triées:", sorted);
    setAddresses(sorted);
    setWithOrdering(true);
  };

  // Régénérer le HTML lorsque les adresses ou l'option ordering changent
  useEffect(() => {
    if (addresses.length > 0) {
      const html = generateHTML(addresses, withOrdering);
      setHtmlContent(html);
    }
  }, [addresses, withOrdering]);

  if (loading || !htmlContent) {
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

      {/* Bouton pour obtenir l'itinéraire (tri optimal) */}
      {!withOrdering && (
        <View style={styles.routeButtonContainer}>
          <Button title="Obtenir l'itinéraire" onPress={handleComputeOrder} />
        </View>
      )}

      {/* WebView affichant la carte Google Maps responsive */}
      <WebView
        key={withOrdering ? "ordered" : "unordered"}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        style={{ width: width, height: height - headerHeight - 50 }}
      />
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
  routeButtonContainer: {
    padding: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },
});
