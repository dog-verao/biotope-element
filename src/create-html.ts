import { render, html } from 'lighterhtml';

import { Renderer, ComponentInstance, RenderFuntion } from './internal-types';

export const createRender = (
  context: ComponentInstance,
  originalRender: Function,
  postFunction: Function,
): RenderFuntion => render
  .bind(context, context.shadowRoot || context, (): void => {
    const element = originalRender();

    // eslint-disable-next-line no-underscore-dangle
    if (!context.__initAttributesCallStack.length) {
      setTimeout(postFunction);
    }
    return element;
  });

export const createPartial = (): Renderer<HTMLElement> => html;