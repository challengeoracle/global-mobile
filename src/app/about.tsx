import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/domains/auth/hooks/auth-context";
import { getCatalogStoreIdFromLocal } from "@/src/domains/catalog/repositories/catalog-repository";
import { getAnalyticsSummaryResource, getCatalogResource, getOrderResource } from "@/src/domains/hateoas/services/hateoas-service";
import { HateoasLinks } from "@/src/domains/hateoas/types/hateoas";
import { getMyOrders } from "@/src/domains/order/services/order-service";
import { ProtectedRoute } from "@/src/shared/components/auth/protected-route";
import { Button } from "@/src/shared/components/ui/button";
import { PageHeader } from "@/src/shared/components/ui/page-header";

const COMMIT_REFERENCE = String(Constants.expoConfig?.extra?.commitReference ?? "desconhecido");

export default function AboutScreen() {
    const { user } = useAuth();
    const [loadingExamples, setLoadingExamples] = useState(false);
    const [demoError, setDemoError] = useState<string | null>(null);
    const [analyticsLinks, setAnalyticsLinks] = useState<HateoasLinks | null>(null);
    const [catalogLinks, setCatalogLinks] = useState<HateoasLinks | null>(null);
    const [orderLinks, setOrderLinks] = useState<HateoasLinks | null>(null);

    const loadHateoasExamples = useCallback(async () => {
        setLoadingExamples(true);
        setDemoError(null);

        try {
            const [analyticsResource, localStoreId, myOrders] = await Promise.all([
                getAnalyticsSummaryResource(),
                getCatalogStoreIdFromLocal(),
                getMyOrders(),
            ]);

            setAnalyticsLinks(analyticsResource._links ?? null);

            const catalogStoreId = user?.storeId ?? localStoreId;
            if (catalogStoreId) {
                const catalogResource = await getCatalogResource(catalogStoreId);
                setCatalogLinks(catalogResource._links ?? null);
            } else {
                setCatalogLinks(null);
            }

            const firstOrder = myOrders[0];
            if (firstOrder?.id) {
                const orderResource = await getOrderResource(firstOrder.id);
                setOrderLinks(orderResource._links ?? null);
            } else {
                setOrderLinks(null);
            }
        } catch (error) {
            setDemoError(error instanceof Error ? error.message : "Não foi possível carregar os resources HATEOAS.");
        } finally {
            setLoadingExamples(false);
        }
    }, [user?.storeId]);

    return (
        <ProtectedRoute>
            <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
                <View className="px-6 pb-10 pt-14">
                    <Pressable onPress={() => router.push("/(tabs)/settings")} className="mb-6 h-11 w-11 items-center justify-center rounded-2xl bg-card">
                        <Ionicons name="arrow-back" size={20} color="#f8fafc" />
                    </Pressable>

                    <PageHeader eyebrow="Sobre o App" title="OffPay" description="Informações de referência da versão atual do aplicativo." />

                    <View className="rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Visão geral</Text>
                        <Text className="mt-2 text-base leading-7 text-muted-foreground">O OffPay foi pensado para manter catálogo, pedidos, pagamentos e sincronização funcionando mesmo em cenários com conexão instável.</Text>
                    </View>

                    <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Commit de referência</Text>
                        <Text selectable className="mt-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm font-bold text-card-foreground">
                            {COMMIT_REFERENCE}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-muted-foreground">Use esse hash para identificar a revisão do app que serviu de base para esta entrega.</Text>
                    </View>

                    <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Pilares do projeto</Text>
                        <View className="mt-4 gap-3">
                            <InfoRow title="Offline-first" description="As operações nascem localmente e seguem disponíveis mesmo sem internet." />
                            <InfoRow title="Sincronização segura" description="Os dados são reconciliados com o backend quando a conexão volta." />
                            <InfoRow title="Pagamento integrado" description="Carteiras, extratos e status de pagamento ficam conectados ao fluxo dos pedidos." />
                        </View>
                    </View>

                    <View className="mt-6 rounded-3xl border border-border bg-card p-5">
                        <Text className="text-lg font-black text-card-foreground">Demonstração HATEOAS</Text>
                        <Text className="mt-2 text-sm leading-6 text-muted-foreground">
                            Esta seção consome endpoints paralelos com hipermídia sem alterar os contratos usados no fluxo principal do app.
                        </Text>

                        <View className="mt-4">
                            <Button title="Carregar Resources" onPress={loadHateoasExamples} loading={loadingExamples} />
                        </View>

                        {demoError ? <Text className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{demoError}</Text> : null}

                        <HateoasCard
                            title="Analytics Summary Resource"
                            description="GET /analytics/me/summary/resource"
                            links={analyticsLinks}
                            emptyLabel="Carregue os exemplos para ver os links retornados pelo summary."
                        />

                        <HateoasCard
                            title="Catalog Resource"
                            description="GET /catalog/store/{storeId}/resource"
                            links={catalogLinks}
                            emptyLabel="Nenhuma loja disponível para demonstração neste dispositivo."
                        />

                        <HateoasCard
                            title="Order Resource"
                            description="GET /order/{id}/resource"
                            links={orderLinks}
                            emptyLabel="Nenhum pedido encontrado para montar o resource."
                        />
                    </View>
                </View>
            </ScrollView>
        </ProtectedRoute>
    );
}

function InfoRow({ title, description }: { title: string; description: string }) {
    return (
        <View className="rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-black text-card-foreground">{title}</Text>
            <Text className="mt-1 text-sm leading-6 text-muted-foreground">{description}</Text>
        </View>
    );
}

function HateoasCard({
    title,
    description,
    links,
    emptyLabel,
}: {
    title: string;
    description: string;
    links: HateoasLinks | null;
    emptyLabel: string;
}) {
    const entries = links ? Object.entries(links) : [];

    return (
        <View className="mt-4 rounded-2xl border border-border bg-background p-4">
            <Text className="text-sm font-black text-card-foreground">{title}</Text>
            <Text className="mt-1 text-xs leading-5 text-muted-foreground">{description}</Text>

            {entries.length === 0 ? (
                <Text className="mt-3 text-sm leading-6 text-muted-foreground">{emptyLabel}</Text>
            ) : (
                <View className="mt-3 gap-3">
                    {entries.map(([rel, link]) => (
                        <View key={rel} className="rounded-2xl border border-border px-3 py-3">
                            <Text className="text-xs font-black uppercase tracking-[1.5px] text-card-foreground">{rel}</Text>
                            <Text selectable className="mt-1 text-xs leading-5 text-muted-foreground">
                                {link.href}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}
