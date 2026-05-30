import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { createLocalOrderFromConfirmationQr } from "@/src/domains/order/repositories/order-repository";
import { decodeOrderConfirmationQr } from "@/src/domains/order/utils/order-qr";
import { getOrCreateDeviceId } from "@/src/shared/lib/secure-storage";

type Props = {
    visible: boolean;
    onClose: () => void;
    onConfirmed: (localOrderId: string) => void | Promise<void>;
};

export function OrderConfirmationScannerModal({ visible, onClose, onConfirmed }: Props) {
    const [permission, requestPermission] = useCameraPermissions();

    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState("");

    function closeScanner() {
        setScanned(false);
        setError("");
        onClose();
    }

    async function handleScan(data: string) {
        if (scanned) return;

        try {
            setScanned(true);
            setError("");

            const payload = decodeOrderConfirmationQr(data);
            const deviceId = await getOrCreateDeviceId();

            await createLocalOrderFromConfirmationQr({
                payload,
                customerDeviceId: deviceId,
            });

            await onConfirmed(payload.localOrderId);

            closeScanner();
        } catch (err) {
            setError(err instanceof Error ? err.message : "QR Code de confirmação inválido.");

            setTimeout(() => {
                setScanned(false);
            }, 2000);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View className="flex-1 bg-black">
                <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-6 pt-14">
                    <View>
                        <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">Confirmação</Text>

                        <Text className="mt-1 text-2xl font-black text-white">Escanear vendedor</Text>
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

                        <Text className="mt-3 text-center leading-6 text-white/70">Precisamos da câmera para ler a confirmação do vendedor.</Text>

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
                            <View className="h-72 w-72 rounded-[32px] border-4 border-white" />
                        </View>

                        <View className="absolute bottom-0 left-0 right-0 px-6 pb-12">
                            <View className="rounded-3xl bg-black/70 p-5">
                                <Text className="text-center text-base font-black text-white">Aponte para o QR do vendedor</Text>

                                <Text className="mt-2 text-center text-sm leading-6 text-white/70">Isso salva ou atualiza o pedido no seu histórico local.</Text>

                                {error ? <Text className="mt-4 text-center text-sm font-bold text-red-400">{error}</Text> : null}
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}
