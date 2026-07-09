import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { ToastService } from '@app/core/toast/toast.service';

vi.mock('@spartan-ng/brain/sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe('ToastService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates success() to sonner toast.success', () => {
    const service = TestBed.inject(ToastService);
    service.success('Bus created successfully');
    expect(toast.success).toHaveBeenCalledWith('Bus created successfully');
  });

  it('delegates error() to sonner toast.error', () => {
    const service = TestBed.inject(ToastService);
    service.error('Failed to save schedule');
    expect(toast.error).toHaveBeenCalledWith('Failed to save schedule');
  });
});
