import type { useAiEngine } from '@/hooks/useAiEngine';
import { Button } from '@/ui/Button';
import { Typography } from '@/ui/Typography';

// Component
export const ModelStatus = ({
  state,
  onLoad,
}: {
  state: ReturnType<typeof useAiEngine>['state'];
  onLoad: () => void;
}) => {
  switch (state.status) {
    case 'unsupported': {
      return (
        <Typography variant="body" tone="muted">
          This needs WebGPU, which this browser or device does not support.
        </Typography>
      );
    }
    case 'checking': {
      return (
        <Typography variant="body" tone="muted">
          Checking for the model…
        </Typography>
      );
    }
    case 'download': {
      return (
        <>
          <Typography variant="body" tone="muted">
            The AI runs entirely in your browser: nothing you write leaves your
            device. It needs to download a small language model (about 1 GB)
            once, which is then stored in your browser.
          </Typography>
          <Button
            variant="solid"
            size="md"
            className="self-start"
            onClick={onLoad}
          >
            Download model
          </Button>
        </>
      );
    }
    case 'loading': {
      return (
        <>
          <Typography variant="body" tone="muted">
            Loading the model. This can take a few minutes the first time.
          </Typography>
          <progress
            aria-label="Model download progress"
            value={state.progress}
            max={1}
            className="h-2 w-full accent-sky-500"
          />
          <Typography variant="caption" tone="muted">
            {state.text}
          </Typography>
        </>
      );
    }
    case 'error': {
      return (
        <>
          <Typography variant="body" tone="danger">
            {state.message}
          </Typography>
          <Button
            variant="solid"
            size="md"
            className="self-start"
            onClick={onLoad}
          >
            Try again
          </Button>
        </>
      );
    }
    case 'ready': {
      return null;
    }
  }
};
