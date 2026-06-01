import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useColorScheme } from "nativewind";

import { InsightAskResponse } from "../types/insights";

type InsightAssistantCardProps = {
    asking: boolean;
    answer: InsightAskResponse | null;
    disabled?: boolean;
    onSubmit: (question: string) => Promise<unknown>;
    promptPlaceholder?: string;
};

export function InsightAssistantCard({ asking, answer, disabled, onSubmit, promptPlaceholder }: InsightAssistantCardProps) {
    const { colorScheme } = useColorScheme();
    const [question, setQuestion] = useState("");
    const [error, setError] = useState("");

    const placeholderColor = colorScheme === "dark" ? "#71717a" : "#a1a1aa";

    async function handleSend() {
        const value = question.trim();

        if (!value) {
            setError("Digite uma pergunta para consultar o assistente.");
            return;
        }

        try {
            setError("");
            await onSubmit(value);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível consultar o assistente agora.");
        }
    }

    return (
        <View>
            <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Ionicons name="sparkles" size={20} color="#dc2626" />
                </View>

                <View className="flex-1">
                    <Text className="text-xl font-black text-card-foreground">OffPay Insights</Text>
                    <Text className="mt-1 text-base leading-7 text-muted-foreground">Olá, como posso te ajudar hoje?</Text>
                </View>
            </View>

            <View className="mt-5 rounded-[28px] border border-border bg-card px-4 py-4">
                <TextInput
                    value={question}
                    onChangeText={(value) => {
                        setQuestion(value);
                        if (error) setError("");
                    }}
                    editable={!disabled && !asking}
                    placeholder={promptPlaceholder ?? "Digite sua pergunta"}
                    placeholderTextColor={placeholderColor}
                    className="min-h-[92px] text-base text-card-foreground"
                    multiline
                    textAlignVertical="top"
                />

                <View className="mt-4 flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-sm leading-6 text-muted-foreground">Escreva sua pergunta de forma direta.</Text>

                    <Pressable onPress={handleSend} disabled={disabled || asking} className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 disabled:opacity-60">
                        {asking ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="arrow-up" size={16} color="#ffffff" />}
                        <Text className="text-sm font-bold text-primary-foreground">{asking ? "Enviando" : "Perguntar"}</Text>
                    </Pressable>
                </View>
            </View>

            <View className="mt-6 gap-3">
                <View className="self-start max-w-[88%] rounded-[24px] rounded-bl-md bg-muted px-4 py-3">
                    <Text className="text-base leading-7 text-card-foreground">Olá, como posso te ajudar hoje?</Text>
                </View>

                {answer ? (
                    <View className="self-start max-w-[92%] rounded-[24px] rounded-bl-md bg-primary px-4 py-4">
                        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-primary-foreground/80">Resposta da IA</Text>
                        <Text className="mt-2 text-sm leading-7 text-primary-foreground">{answer.answer}</Text>
                    </View>
                ) : (
                    <Text className="text-sm leading-6 text-muted-foreground">A resposta vai aparecer aqui assim que você enviar a pergunta.</Text>
                )}
            </View>

            {error ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{error}</Text> : null}
        </View>
    );
}
