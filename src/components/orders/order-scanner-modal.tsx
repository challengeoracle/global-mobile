import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { useAuth } from "@/src/contexts/auth-context";
import { createLocalOrderFromQr } from "@/src/database/repositories/order-repository";
import { getOrCreateDeviceId } from "@/src/lib/secure-storage";
import { decodeOrderQr } from "@/src/utils/order-qr";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirmed: (localOrderId: string) => void | Promise<void>;
};

export function OrderScannerModal({ visible, onClose, onConfirmed }: Props) {
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();

    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const boxScale = useSharedValue(1);
    const boxOpacity = useSharedValue(0.4);

    const iconScale = useSharedValue(0);
    const iconOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible && !scanned) {
            iconScale.value = 0;
            iconOpacity.value = 0;

            boxScale.value = withTiming(1, { duration: 300 });
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

            if (!user) {
                throw new Error("Usuário não encontrado.");
            }

            if (user.role !== "SELLER") {
                throw new Error("Apenas vendedores podem confirmar pedidos.");
            }

            const deviceId = await getOrCreateDeviceId();

            boxOpacity.value = withTiming(1, { duration: 100 });
            boxScale.value = withSequence(withTiming(0.6, { duration: 150, easing: Easing.out(Easing.exp) }), withSpring(0.75, { damping: 12, stiffness: 200 }));

            iconOpacity.value = withTiming(1, { duration: 100 });
            iconScale.value = withSpring(1, { damping: 10, stiffness: 150 });

            const payload = decodeOrderQr(data);

            const created = await createLocalOrderFromQr({
                payload,
                sellerId: user.id,
                sellerDeviceId: deviceId,
            });

            await onConfirmed(created.localOrderId);

            setSuccess("Pedido confirmado.");

            closeScanner();
        } catch (err) {
            console.log("Erro ao confirmar pedido:", err);
            setError(err instanceof Error ? err.message : "QR Code inválido.");

            setTimeout(() => {
                setScanned(false);
            }, 2000);
        }
    }

    const animatedBoxStyle = useAnimatedStyle(() => ({
        transform: [{ scale: boxScale.value }],
        opacity: boxOpacity.value,
        backgroundColor: scanned ? "rgba(255, 255, 255, 0.15)" : "transparent",
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
        opacity: iconOpacity.value,
    }));

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View className="flex-1 bg-black">
                <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-6 pt-14">
                    <View>
                        <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">Pedido offline</Text>

                        <Text className="mt-1 text-2xl font-black text-white">Confirmar venda</Text>
                    </View>

                    <Pressable onPress={closeScanner} className="h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                        <Ionicons name="close" size={22} color="#ffffff" />
                    </Pressable>
                </View>

                {!permission ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-center text-white">Carregando câmera...</Text>
                    </View>
                ) : !permission.granted ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-center text-xl font-black text-white">Permissão da câmera</Text>

                        <Text className="mt-3 text-center leading-6 text-white/70">Precisamos da câmera para ler o QR Code do pedido do cliente.</Text>

                        <Pressable onPress={requestPermission} className="mt-6 h-12 items-center justify-center rounded-2xl bg-white px-6">
                            <Text className="font-black uppercase tracking-[1px] text-black">Permitir câmera</Text>
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
                            <Animated.View style={animatedBoxStyle} className="h-72 w-72 rounded-[32px] border-4 border-white" />
                        </View>

                        <Animated.View style={animatedIconStyle} className="absolute inset-0 items-center justify-center">
                            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary">
                                <Ionicons name="checkmark" size={52} color="#ffffff" />
                            </View>
                        </Animated.View>

                        <View className="absolute bottom-0 left-0 right-0 px-6 pb-12">
                            <View className="rounded-3xl bg-black/70 p-5">
                                <Text className="text-center text-base font-black text-white">Aponte para o QR do cliente</Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-white/70">O pedido será salvo neste aparelho e sincronizado quando houver conexão.</Text>

                                {success ? <Text className="mt-4 text-center text-sm font-bold text-primary">{success}</Text> : null}

                                {error ? <Text className="mt-4 text-center text-sm font-bold text-red-400">{error}</Text> : null}
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}
