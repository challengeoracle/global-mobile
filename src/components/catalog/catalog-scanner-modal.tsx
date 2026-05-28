import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { saveCatalogFromQr } from "@/src/database/repositories/catalog-repository";
import { decodeCatalogQr } from "@/src/utils/catalog-qr";

type CatalogScannerModalProps = {
    visible: boolean;
    onClose: () => void;
    onImported: () => void;
};

export function CatalogScannerModal({ visible, onClose, onImported }: CatalogScannerModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState("");

    async function handleScan(data: string) {
        if (scanned) return;

        console.log("QR lido:", data);

        try {
            setScanned(true);
            setError("");

            const payload = decodeCatalogQr(data);

            await saveCatalogFromQr(payload);

            onImported();
            onClose();
        } catch (err) {
            console.log("Erro ao importar QR:", err);

            setError(err instanceof Error ? err.message : "QR Code inválido.");
            setScanned(false);
        }
    }

    function closeScanner() {
        setScanned(false);
        setError("");
        onClose();
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={closeScanner}>
            <View className="flex-1 bg-black">
                <View className="absolute left-0 right-0 top-0 z-10 px-6 pt-14">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-sm font-bold uppercase tracking-[3px] text-white/70">Catálogo</Text>
                            <Text className="mt-2 text-3xl font-black text-white">Escanear QR</Text>
                        </View>

                        <Pressable onPress={closeScanner} className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                            <Ionicons name="close" size={22} color="#fff" />
                        </Pressable>
                    </View>
                </View>

                {!permission ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <Text className="text-center text-white">Carregando câmera...</Text>
                    </View>
                ) : !permission.granted ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <Text className="text-center text-lg font-black text-white">Permissão da câmera</Text>

                        <Text className="mt-3 text-center text-sm leading-6 text-white/70">Precisamos da câmera para ler o QR Code do catálogo da loja.</Text>

                        <Pressable onPress={requestPermission} className="mt-6 h-14 items-center justify-center rounded-2xl bg-white px-6">
                            <Text className="text-sm font-black uppercase tracking-[2px] text-black">Permitir câmera</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                            onBarcodeScanned={({ data }) => handleScan(data)}
                        />

                        <View className="absolute inset-0 items-center justify-center">
                            <View className="h-72 w-72 rounded-[32px] border-4 border-white/80" />
                        </View>

                        <View className="absolute bottom-0 left-0 right-0 px-6 pb-10">
                            <View className="rounded-3xl bg-black/60 p-5">
                                <Text className="text-center text-base font-black text-white">Aponte para o QR do vendedor</Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-white/70">O catálogo será salvo neste aparelho para montar o pedido.</Text>

                                {error ? <Text className="mt-4 rounded-2xl bg-red-500/20 px-4 py-3 text-center text-sm font-bold text-red-200">{error}</Text> : null}
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}
