import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { saveCatalogFromQr } from "@/src/database/repositories/catalog-repository";
import { decodeCatalogQr } from "@/src/utils/catalog-qr";

type CatalogScannerModalProps = {
    visible: boolean;
    onClose: () => void;
    onImported: () => void | Promise<void>;
};

export function CatalogScannerModal({ visible, onClose, onImported }: CatalogScannerModalProps) {
    const [permission, requestPermission] = useCameraPermissions();

    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // --- Valores da Animação ---
    const boxScale = useSharedValue(1);
    const boxOpacity = useSharedValue(0.4);

    // Valores do Ícone de Sucesso
    const iconScale = useSharedValue(0);
    const iconOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible && !scanned) {
            // Reseta o ícone
            iconScale.value = 0;
            iconOpacity.value = 0;
            boxScale.value = withTiming(1, { duration: 300 });

            // Efeito de "respiração" (pulsação) na borda enquanto procura
            boxOpacity.value = withRepeat(withSequence(withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) }), withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })), -1);
        }
    }, [visible, scanned, boxOpacity, boxScale, iconScale, iconOpacity]);

    function closeScanner() {
        setScanned(false);
        setError("");
        setSuccess("");
        onClose();
    }

    async function handleScan(data: string) {
        if (scanned) return;

        try {
            setScanned(true);
            setError("");
            setSuccess("");

            // Animação Agressiva de "Captura" estilo Telegram

            // 1. O quadrado dá um zoom forte para dentro e fica sólido
            boxOpacity.value = withTiming(1, { duration: 100 });
            boxScale.value = withSequence(
                withTiming(0.6, { duration: 150, easing: Easing.out(Easing.exp) }), // Puxa rápido
                withSpring(0.75, { damping: 12, stiffness: 200 }), // Dá um rebote e para
            );

            // 2. O ícone de check salta no meio da tela
            iconOpacity.value = withTiming(1, { duration: 100 });
            iconScale.value = withSpring(1, { damping: 10, stiffness: 150 }); // Efeito elástico

            const payload = decodeCatalogQr(data);
            await saveCatalogFromQr(payload);
            await onImported();

            setSuccess("Catálogo importado.");

            setTimeout(() => {
                closeScanner();
            }, 1200); // Dá um tempinho a mais para o usuário curtir a animação
        } catch (err) {
            console.log("Erro ao importar QR:", err);
            setError(err instanceof Error ? err.message : "QR Code inválido.");

            setTimeout(() => {
                setScanned(false);
            }, 2000);
        }
    }

    // --- Estilos Animados ---
    const animatedBoxStyle = useAnimatedStyle(() => ({
        transform: [{ scale: boxScale.value }],
        opacity: boxOpacity.value,
        backgroundColor: scanned ? "rgba(255, 255, 255, 0.15)" : "transparent", // Dá um fundo translúcido ao capturar
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
        opacity: iconOpacity.value,
    }));

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
                        <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => handleScan(data)} />

                        {/* Viewfinder Centralizado e Animado */}
                        <View className="absolute inset-0 items-center justify-center pointer-events-none">
                            <Animated.View style={animatedBoxStyle} className="h-72 w-72 rounded-[32px] border-4 border-white items-center justify-center">
                                {/* Ícone de Check Animado que aparece ao capturar */}
                                <Animated.View style={animatedIconStyle}>
                                    <Ionicons name="checkmark-circle" size={80} color="#fff" />
                                </Animated.View>
                            </Animated.View>
                        </View>

                        <View className="absolute bottom-0 left-0 right-0 px-6 pb-10">
                            <View className="rounded-3xl bg-black/60 p-5">
                                <Text className="text-center text-base font-black text-white">Aponte para o QR do vendedor</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-white/70">O catálogo será salvo neste aparelho para montar o pedido.</Text>

                                {success ? <Text className="mt-4 rounded-2xl bg-white/20 px-4 py-3 text-center text-sm font-bold text-white">{success}</Text> : null}
                                {error ? <Text className="mt-4 rounded-2xl bg-red-500/20 px-4 py-3 text-center text-sm font-bold text-red-200">{error}</Text> : null}
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}
