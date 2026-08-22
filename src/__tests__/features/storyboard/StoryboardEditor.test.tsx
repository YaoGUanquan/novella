import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { generateImage } from '@/core/services/ai/image/image-generation-service';
import type { StoryboardFrame } from '@/core/storyboard/types/storyboard';
import { StoryboardEditor } from '@/features/storyboard/components/StoryboardEditor';

jest.mock('@/core/services/ai/image/image-generation-service', () => ({
  generateImage: jest.fn(),
}));

const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>;

const frame: StoryboardFrame = {
  id: 'frame-1',
  title: '雨夜街道',
  sceneDescription: '雨夜的城市街道，主角独自前行。',
  composition: '全景',
  cameraType: '推镜',
  dialogue: '前路未明。',
  duration: 5,
};

describe('StoryboardEditor', () => {
  beforeEach(() => {
    mockGenerateImage.mockReset();
  });

  it('shows a Chinese empty state instead of demonstration frames', () => {
    render(<StoryboardEditor initialFrames={[]} />);

    expect(screen.getByText('暂无分镜')).toBeInTheDocument();
    expect(screen.queryByText(/赛博街道/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('writes a configured image result back to only the selected frame', async () => {
    mockGenerateImage.mockResolvedValueOnce({
      url: 'https://example.test/generated.png',
      width: 2048,
      height: 2048,
      model: 'configured-image',
    });
    const onChange = jest.fn();

    render(<StoryboardEditor initialFrames={[frame]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '生成当前画面' }));

    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledWith(frame.sceneDescription, { size: '2K' });
    });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: frame.id, imageUrl: 'https://example.test/generated.png' }),
    ]);
  });

  it('uses a real video element only when the frame has a video URL', () => {
    const { rerender } = render(
      <StoryboardEditor
        initialFrames={[{ ...frame, imageUrl: 'https://example.test/frame.png' }]}
      />
    );
    expect(screen.getByText('当前为画面参考图，尚未生成视频。')).toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();

    rerender(
      <StoryboardEditor
        initialFrames={[{ ...frame, videoUrl: 'https://example.test/frame.mp4' }]}
      />
    );
    expect(document.querySelector('video')).toHaveAttribute(
      'src',
      'https://example.test/frame.mp4'
    );
  });
});
