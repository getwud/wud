import { mount } from '@vue/test-utils';
import TriggerTestDialog from '@/components/TriggerTestDialog.vue';
import * as triggerService from '@/services/trigger';

jest.mock('@/services/trigger', () => ({
  runTrigger: jest.fn(),
}));

describe('TriggerTestDialog.vue', () => {
  const mockTrigger = {
    id: 'slack.myslack',
    type: 'slack',
    name: 'myslack',
  };

  it('renders correctly when opened', () => {
    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    expect(wrapper.text()).toContain('Test Trigger');
    expect(wrapper.text()).toContain('slack / myslack');
  });

  it('emits update:modelValue on close', () => {
    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    (wrapper.vm as any).close();
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('calls runTrigger service when executing trigger', async () => {
    (triggerService.runTrigger as jest.Mock).mockResolvedValueOnce({ ok: true });

    const wrapper = mount(TriggerTestDialog, {
      props: {
        modelValue: true,
        trigger: mockTrigger,
      },
    });

    await (wrapper.vm as any).executeTrigger();
    expect(triggerService.runTrigger).toHaveBeenCalledWith({
      triggerType: 'slack',
      triggerName: 'myslack',
      container: expect.objectContaining({
        id: '123456789',
        name: 'container_test',
      }),
    });
  });
});
