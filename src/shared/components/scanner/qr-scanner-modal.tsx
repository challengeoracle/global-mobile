import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

type ScanResult = {
    successMessage?: string;
    closeOnSuccess?: boolean;
    closeDelayMs?: number;
};

type QrScannerModalProps = {
    visible: boolean;
    eyebrow: string;
    title: string;
    permissionTitle: string;
    permissionDescription: string;
    instructionTitle: string;
    instructionDescription: string;
    onClose: () => void;
    onScan: (data: string) => Promise<ScanResult | void>;
    successTone?: "primary" | "white";
    footerSlot?: ReactNode;
};

const DEFAULT_CLOSE_DELAY_MS = 1200;

export function QrScannerModal({
    visible,
    eyebrow,
    title,
    permissionTitle,
    permissionDescription,
    instructionTitle,
    instructionDescription,
    onClose,
    onScan,
    successTone = "primary",
    footerSlot,
}: QrScannerModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const boxScale = useSharedValue(1);
    const boxOpacity = useSharedValue(0.4);
    const iconScale = useSharedValue(0);
    const iconOpacity = useSharedValue(0);

    useEffect(() => {
        if (!visible) {
            setScanned(false);
            setError("");
            setSuccess("");
            return;
        }

        if (!scanned) {
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

            boxOpacity.value = withTiming(1, { duration: 100 });
            boxScale.value = withSequence(withTiming(0.6, { duration: 150, easing: Easing.out(Easing.exp) }), withSpring(0.75, { damping: 12, stiffness: 200 }));
            iconOpacity.value = withTiming(1, { duration: 100 });
            iconScale.value = withSpring(1, { damping: 10, stiffness: 150 });

            const result = await onScan(data);

            if (result?.successMessage) {
                setSuccess(result.successMessage);
            }

            if (result?.closeOnSuccess) {
                setTimeout(() => {
                    closeScanner();
                }, result.closeDelayMs ?? DEFAULT_CLOSE_DELAY_MS);
            }
        } catch (err) {
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

    const successClassName = successTone === "white" ? "text-white" : "text-primary";

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeScanner}>
            <View className="flex-1 bg-black">
                <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-6 pt-14">
                    <View>
                        <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">{eyebrow}</Text>
                        <Text className="mt-1 text-2xl font-black text-white">{title}</Text>
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
                        <Text className="text-center text-xl font-black text-white">{permissionTitle}</Text>
                        <Text className="mt-3 text-center leading-6 text-white/70">{permissionDescription}</Text>
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

                        <View className="absolute inset-0 items-center justify-center pointer-events-none">
                            <Animated.View style={animatedBoxStyle} className="h-72 w-72 items-center justify-center rounded-[32px] border-4 border-white">
                                <Animated.View style={animatedIconStyle}>
                                    <Ionicons name="checkmark-circle" size={80} color="#ffffff" />
                                </Animated.View>
                            </Animated.View>
                        </View>

                        <View className="absolute bottom-0 left-0 right-0 px-6 pb-12">
                            <View className="rounded-3xl bg-black/70 p-5">
                                <Text className="text-center text-base font-black text-white">{instructionTitle}</Text>
                                <Text className="mt-2 text-center text-sm leading-6 text-white/70">{instructionDescription}</Text>

                                {success ? <Text className={`mt-4 text-center text-sm font-bold ${successClassName}`}>{success}</Text> : null}
                                {error ? <Text className="mt-4 text-center text-sm font-bold text-red-400">{error}</Text> : null}
                                {footerSlot}
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}
