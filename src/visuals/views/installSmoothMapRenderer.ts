import { WorldViewRenderer } from './WorldViewRenderer';
import { SmoothMapRenderer } from './SmoothMapRenderer';

const originalRenderView = WorldViewRenderer.renderView.bind(WorldViewRenderer);

WorldViewRenderer.renderView = (
  ctx,
  canvasWidth,
  canvasHeight,
  state,
  viewMode,
  camera,
  hoveredTile,
  time
) => {
  if (viewMode === 'FLAT_ATLAS' || viewMode === 'SQUARE_TILE') {
    SmoothMapRenderer.render(ctx, canvasWidth, canvasHeight, state, viewMode, camera, hoveredTile);
    return;
  }

  originalRenderView(ctx, canvasWidth, canvasHeight, state, viewMode, camera, hoveredTile, time);
};
