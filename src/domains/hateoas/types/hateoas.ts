export type HateoasLink = {
    href: string;
};

export type HateoasLinks = Record<string, HateoasLink>;

export type HateoasResource<T> = T & {
    _links: HateoasLinks;
};
