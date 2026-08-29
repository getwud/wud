export interface DockerRegistryV2TestOptions {
    matchingUrls?: string[];
    nonMatchingUrls?: string[];
    sampleImage?: {
        input: any;
        expected: any;
    };
    maskConfig?: {
        input: any;
        expected: any;
    };
    authPullConfig?: {
        input: any;
        expected: any;
    };
}

export function testRegistryProvider(
    ProviderClass: any,
    validConfig: any,
    v2Options?: DockerRegistryV2TestOptions,
) {
    describe(`${ProviderClass.name} Registry`, () => {
        let provider: any;

        beforeEach(async () => {
            provider = new ProviderClass();
            if (validConfig) {
                await provider.register(
                    'registry',
                    ProviderClass.name.toLowerCase(),
                    'test',
                    validConfig,
                );
            }
        });

        test('should create instance', () => {
            expect(provider).toBeDefined();
            expect(provider).toBeInstanceOf(ProviderClass);
        });

        test('should have correct configuration schema', () => {
            const schema = provider.getConfigurationSchema();
            expect(schema).toBeDefined();
        });

        if (v2Options?.matchingUrls || v2Options?.nonMatchingUrls) {
            test('should match registry URLs properly', () => {
                if (v2Options.matchingUrls) {
                    v2Options.matchingUrls.forEach((url) => {
                        expect(provider.match(url)).toBe(true);
                    });
                }
                if (v2Options.nonMatchingUrls) {
                    v2Options.nonMatchingUrls.forEach((url) => {
                        expect(provider.match(url)).toBe(false);
                    });
                }
            });
        }

        if (v2Options?.sampleImage) {
            test('should normalize image properly', () => {
                expect(
                    provider.normalizeImage(v2Options.sampleImage!.input),
                ).toEqual(v2Options.sampleImage!.expected);
            });
        }

        if (v2Options?.maskConfig) {
            test('should mask configuration secrets', () => {
                provider.configuration = v2Options.maskConfig!.input;
                expect(provider.maskConfiguration()).toEqual(
                    v2Options.maskConfig!.expected,
                );
            });
        }

        if (v2Options?.authPullConfig) {
            test('should return auth pull credentials', async () => {
                provider.configuration = v2Options.authPullConfig!.input;
                await expect(provider.getAuthPull()).resolves.toEqual(
                    v2Options.authPullConfig!.expected,
                );
            });
        }
    });
}
