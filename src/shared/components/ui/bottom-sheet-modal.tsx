import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, PanResponder, Pressable, Text, View } from "react-native";

type BottomSheetModalProps = {
    visible: boolean;
    title: string;
    eyebrow?: string;
    children: ReactNode;
    onClose: () => void;
    maxHeightClassName?: string;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function BottomSheetModal({ visible, title, eyebrow, children, onClose, maxHeightClassName = "max-h-[88%]" }: BottomSheetModalProps) {
    const [mounted, setMounted] = useState(visible);

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const closeAnimated = useCallback((notifyOnClose = true) => {
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 200,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setMounted(false);
            if (notifyOnClose) {
                onClose();
            }
        });
    }, [backdropOpacity, translateY, onClose]);

    useEffect(() => {
        if (visible) {
            setMounted(true);

            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 240,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start();

            return;
        }

        if (!mounted) {
            return;
        }

        closeAnimated(false);
    }, [visible, mounted, backdropOpacity, translateY, closeAnimated]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8,
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    translateY.setValue(gesture.dy);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 90 || gesture.vy > 1.2) {
                    closeAnimated();
                    return;
                }

                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 180,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }).start();
            },
        }),
    ).current;

    if (!mounted) return null;

    return (
        <Modal visible={mounted} transparent animationType="none" onRequestClose={closeAnimated}>
            <View className="flex-1 justify-end">
                <Animated.View style={{ opacity: backdropOpacity }} className="absolute inset-0 bg-black/50">
                    <Pressable className="flex-1" onPress={closeAnimated} />
                </Animated.View>

                <Animated.View style={{ transform: [{ translateY }] }} className={`${maxHeightClassName} rounded-t-[32px] border-x border-t border-border bg-background px-6 pb-8 pt-4`}>
                    <View {...panResponder.panHandlers} className="mb-4 items-center">
                        <View className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                    </View>

                    <View className="mb-6 flex-row items-center justify-between gap-4">
                        <View className="flex-1">
                            {eyebrow ? <Text className="text-sm font-bold uppercase tracking-[3px] text-primary">{eyebrow}</Text> : null}

                            <Text className="mt-2 text-3xl font-black tracking-[-1px] text-foreground">{title}</Text>
                        </View>

                        <Pressable onPress={closeAnimated} className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                            <Ionicons name="close" size={20} color="#ffffff" />
                        </Pressable>
                    </View>

                    {children}

                    <View className="absolute -bottom-64 left-0 right-0 h-64 border-x border-border bg-background" />
                </Animated.View>
            </View>
        </Modal>
    );
}
