import { ComponentConfiguration } from '../../registry/Component';

export function testRegistryProvider(ProviderClass: any, validConfig: any) {
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
    });
}
