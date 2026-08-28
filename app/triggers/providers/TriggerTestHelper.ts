import { ValidationError } from 'joi';
import Trigger from './Trigger';

export interface TriggerTestHelperOptions {
    testTemplateRenders?: boolean;
}

export function testTriggerProvider(
    ProviderClass: any,
    validConfiguration: any,
    options: TriggerTestHelperOptions = {
        testTemplateRenders: true,
    }
) {
    let provider: Trigger;

    beforeEach(() => {
        provider = new ProviderClass();
        jest.clearAllMocks();
    });

    test('should create instance', async () => {
        expect(provider).toBeDefined();
        expect(provider).toBeInstanceOf(ProviderClass);
        expect(provider).toBeInstanceOf(Trigger);
    });

    test('should have correct configuration schema', async () => {
        const schema = provider.getConfigurationSchema();
        expect(schema).toBeDefined();
    });

    test('should validate configuration when valid', async () => {
        const validatedConfiguration = provider.validateConfiguration(validConfiguration);
        expect(validatedConfiguration).toBeDefined();
    });

    if (options.testTemplateRenders) {
        test('should trigger with container (verify render calls)', async () => {
            provider.configuration = validConfiguration;
            provider.renderSimpleTitle = jest.fn().mockReturnValue('Title');
            provider.renderSimpleBody = jest.fn().mockReturnValue('Body');
            
            const container = { name: 'test' } as any;

            try {
                if (typeof (provider as any).sendMessage === 'function') {
                    (provider as any).sendMessage = jest.fn().mockResolvedValue({});
                }
                await provider.trigger(container);
            } catch (e) {
                // Ignore network errors
            }

            // In some cases, `disabletitle` might be set, but `renderSimpleBody` should always be called.
            expect(provider.renderSimpleBody).toHaveBeenCalled();
        });

        test('should trigger batch with containers (verify render calls)', async () => {
            provider.configuration = validConfiguration;
            provider.renderBatchTitle = jest.fn().mockReturnValue('Batch Title');
            provider.renderBatchBody = jest.fn().mockReturnValue('Batch Body');
            
            const containers = [{ name: 'test1' }, { name: 'test2' }] as any[];

            try {
                if (typeof (provider as any).sendMessage === 'function') {
                    (provider as any).sendMessage = jest.fn().mockResolvedValue({});
                }
                await provider.triggerBatch(containers);
            } catch (e) {
                // Ignore network errors
            }

            expect(provider.renderBatchBody).toHaveBeenCalled();
        });
    }
}
