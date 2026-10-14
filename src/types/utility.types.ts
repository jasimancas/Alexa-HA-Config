export type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
	[Property in Key]-?: Type[Property];
};

export interface JsonLikeObject {
	[key: string]: string | number | boolean | JsonLikeObject | JsonLikeObject[];
}
